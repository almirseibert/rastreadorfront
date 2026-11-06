import express from 'express';
import { execute, query, queryOne } from '../db.js';
import { loadOrder, requireReviewer } from '../auth.js';
import { getVisibleDevice } from '../traccar.js';
import {
  REQUIRED_PHOTO_SLOTS,
  STATUS,
  allowedTransitions,
  findTransition,
  isEditable,
} from '../status.js';
import { audit } from '../audit.js';

const router = express.Router();

// Campos que o instalador pode gravar (lista explícita: evita UPDATE em coluna de controle).
const EDITABLE_FIELDS = {
  deviceId: 'device_id',
  deviceUniqueId: 'device_unique_id',
  customerUserId: 'customer_user_id',
  customerGroupId: 'customer_group_id',
  templateId: 'template_id',
  equipmentCategory: 'equipment_category',
  trackerModel: 'tracker_model',
  simCarrier: 'sim_carrier',
  simNumber: 'sim_number',
  vehiclePlate: 'vehicle_plate',
  vehicleBrand: 'vehicle_brand',
  vehicleModel: 'vehicle_model',
  vehicleYear: 'vehicle_year',
  vehicleColor: 'vehicle_color',
  odometerStart: 'odometer_start',
  installLocation: 'install_location',
  hasImmobilizer: 'has_immobilizer',
  hasSiren: 'has_siren',
  hasPanicButton: 'has_panic_button',
  notes: 'notes',
  positionOk: 'position_ok',
  blockTestOk: 'block_test_ok',
};

const nextCode = async () => {
  const year = new Date().getUTCFullYear();
  const row = await queryOne(
    'SELECT COUNT(*) AS total FROM argos_install_order WHERE code LIKE ?',
    [`ARG-${year}-%`],
  );
  return `ARG-${year}-${String((row?.total || 0) + 1).padStart(6, '0')}`;
};

const photoUrl = (id, thumb) => (thumb ? `photos/${id}/thumb` : `photos/${id}`);

const loadDetail = async (order) => {
  const items = await query(
    'SELECT * FROM argos_install_item WHERE order_id = ? ORDER BY position',
    [order.id],
  );
  const photos = await query(
    'SELECT * FROM argos_install_photo WHERE order_id = ? AND deleted_at IS NULL ORDER BY slot, position, id',
    [order.id],
  );
  return {
    ...order,
    items,
    photos: photos.map((photo) => ({
      id: photo.id,
      slot: photo.slot,
      position: photo.position,
      bytes: photo.bytes,
      width: photo.width,
      height: photo.height,
      createdAt: photo.created_at,
      url: photoUrl(photo.id, false),
      thumbUrl: photo.thumb_path ? photoUrl(photo.id, true) : photoUrl(photo.id, false),
    })),
  };
};

// GET /orders — escopo conforme o papel do chamador.
router.get('/orders', async (req, res, next) => {
  try {
    const { session } = req;
    const conditions = [];
    const params = [];

    if (!session.manager) {
      conditions.push('installer_user_id = ?');
      params.push(session.userId);
    }
    if (req.query.status) {
      const statuses = String(req.query.status).split(',').filter(Boolean);
      if (statuses.length) {
        conditions.push(`status IN (${statuses.map(() => '?').join(',')})`);
        params.push(...statuses);
      }
    }
    if (req.query.installerId) {
      conditions.push('installer_user_id = ?');
      params.push(Number(req.query.installerId));
    }
    if (req.query.customerGroupId) {
      conditions.push('customer_group_id = ?');
      params.push(Number(req.query.customerGroupId));
    }
    if (req.query.deviceId) {
      conditions.push('device_id = ?');
      params.push(Number(req.query.deviceId));
    }
    if (req.query.from) {
      conditions.push('created_at >= ?');
      params.push(new Date(req.query.from));
    }
    if (req.query.to) {
      conditions.push('created_at <= ?');
      params.push(new Date(req.query.to));
    }
    if (req.query.q) {
      conditions.push(
        '(code LIKE ? OR device_unique_id LIKE ? OR vehicle_plate LIKE ? OR vehicle_model LIKE ?)',
      );
      const like = `%${req.query.q}%`;
      params.push(like, like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    // LIMIT/OFFSET são interpolados, não parametrizados: o MySQL não aceita placeholder
    // nessa posição em prepared statement (`pool.execute`) e devolve
    // "Incorrect arguments to mysqld_stmt_execute". São inteiros já saneados aqui, nunca
    // texto do usuário — todo dado continua indo por placeholder.
    const limit = Math.min(Math.max(Math.trunc(Number(req.query.limit)) || 50, 1), 100);
    const page = Math.max(Math.trunc(Number(req.query.page)) || 1, 1);
    const offset = (page - 1) * limit;

    const total = await queryOne(
      `SELECT COUNT(*) AS total FROM argos_install_order ${where}`,
      params,
    );
    const items = await query(
      `SELECT * FROM argos_install_order ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    res.json({ items, total: total?.total || 0, page, limit });
  } catch (error) {
    next(error);
  }
});

// POST /orders — idempotente por clientDraftId (retry do celular não duplica ordem).
router.post('/orders', async (req, res, next) => {
  try {
    const { session, credentials } = req;
    const { clientDraftId, deviceId, deviceUniqueId, templateId } = req.body || {};

    if (clientDraftId) {
      const existing = await queryOne(
        'SELECT * FROM argos_install_order WHERE client_draft_id = ?',
        [clientDraftId],
      );
      if (existing) {
        res.json(await loadDetail(existing));
        return;
      }
    }

    if (deviceId) {
      const device = await getVisibleDevice(credentials, deviceId);
      if (!device) {
        res.status(403).send('Sem acesso ao dispositivo informado');
        return;
      }
    }

    const code = await nextCode();
    const result = await execute(
      `INSERT INTO argos_install_order
        (code, status, client_draft_id, device_id, device_unique_id, installer_user_id,
         template_id, started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3), NOW(3))`,
      [
        code,
        STATUS.IN_PROGRESS,
        clientDraftId || null,
        deviceId || null,
        deviceUniqueId || null,
        session.userId,
        templateId || null,
      ],
    );

    const order = await queryOne('SELECT * FROM argos_install_order WHERE id = ?', [
      result.insertId,
    ]);

    // Congela os itens do checklist escolhido: editar o modelo depois não reescreve histórico.
    const template = templateId
      ? await queryOne('SELECT * FROM argos_checklist_template WHERE id = ?', [templateId])
      : await queryOne(
          'SELECT * FROM argos_checklist_template WHERE active = 1 AND category IS NULL ORDER BY id LIMIT 1',
        );
    if (template) {
      const templateItems = await query(
        'SELECT * FROM argos_checklist_item WHERE template_id = ? ORDER BY position',
        [template.id],
      );
      for (const item of templateItems) {
        await execute(
          `INSERT INTO argos_install_item
             (order_id, template_item_id, position, label_snapshot, required)
           VALUES (?, ?, ?, ?, ?)`,
          [order.id, item.id, item.position, item.label, item.required],
        );
      }
      if (!templateId) {
        await execute('UPDATE argos_install_order SET template_id = ? WHERE id = ?', [
          template.id,
          order.id,
        ]);
        order.template_id = template.id;
      }
    }

    await audit(req, { orderId: order.id, action: 'order.create', toStatus: order.status });
    res.status(201).json(await loadDetail(order));
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:id', loadOrder, async (req, res, next) => {
  try {
    const detail = await loadDetail(req.order);
    if (req.canReview) {
      detail.audit = await query(
        'SELECT * FROM argos_audit WHERE order_id = ? ORDER BY created_at',
        [req.order.id],
      );
    }
    detail.transitions = allowedTransitions(req.order.status, {
      owner: req.isOwner,
      reviewer: req.canReview,
    }).map((transition) => transition.to);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

router.put('/orders/:id', loadOrder, async (req, res, next) => {
  try {
    if (!isEditable(req.order.status, { reviewer: req.canReview })) {
      res.status(409).send('Ordem concluída não pode mais ser editada');
      return;
    }
    if (!req.isOwner && !req.canReview) {
      res.status(403).send('Apenas o instalador da ordem pode editá-la');
      return;
    }

    const sets = [];
    const params = [];
    for (const [field, column] of Object.entries(EDITABLE_FIELDS)) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        let value = req.body[field];
        if (field === 'deviceId' && value) {
          const device = await getVisibleDevice(req.credentials, value);
          if (!device) {
            res.status(403).send('Sem acesso ao dispositivo informado');
            return;
          }
        }
        if (typeof value === 'boolean') {
          value = value ? 1 : 0;
        }
        sets.push(`${column} = ?`);
        params.push(value === '' ? null : value);
      }
    }
    if (!sets.length) {
      res.json(await loadDetail(req.order));
      return;
    }

    await execute(
      `UPDATE argos_install_order SET ${sets.join(', ')}, updated_at = NOW(3) WHERE id = ?`,
      [...params, req.order.id],
    );
    await audit(req, { orderId: req.order.id, action: 'order.update' });

    const updated = await queryOne('SELECT * FROM argos_install_order WHERE id = ?', [
      req.order.id,
    ]);
    res.json(await loadDetail(updated));
  } catch (error) {
    next(error);
  }
});

// PUT /orders/:id/items — upsert em lote das respostas do checklist.
router.put('/orders/:id/items', loadOrder, async (req, res, next) => {
  try {
    if (!isEditable(req.order.status, { reviewer: req.canReview })) {
      res.status(409).send('Ordem concluída não pode mais ser editada');
      return;
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    // Sem isso, uma posição ausente chega ao driver como `undefined` e virava 500.
    const invalid = items.filter((item) => !Number.isFinite(Number(item?.position)));
    if (invalid.length) {
      res.status(400).send('Cada item do checklist precisa de uma posição numérica');
      return;
    }
    for (const item of items) {
      await execute(
        `UPDATE argos_install_item
         SET result = ?, note = ?, answered_at = NOW(3)
         WHERE order_id = ? AND position = ?`,
        [item.result || null, item.note || null, req.order.id, Number(item.position)],
      );
    }
    await execute('UPDATE argos_install_order SET updated_at = NOW(3) WHERE id = ?', [
      req.order.id,
    ]);
    res.json(await loadDetail(req.order));
  } catch (error) {
    next(error);
  }
});

// Valida se a ordem tem tudo que o laudo exige.
const missingRequirements = async (order) => {
  const missing = [];
  const items = await query(
    'SELECT * FROM argos_install_item WHERE order_id = ? AND required = 1',
    [order.id],
  );
  if (items.some((item) => !item.result)) {
    missing.push('checklist');
  }
  if (items.some((item) => item.result === 'problem' && !item.note)) {
    missing.push('checklistNote');
  }
  const photos = await query(
    'SELECT DISTINCT slot FROM argos_install_photo WHERE order_id = ? AND deleted_at IS NULL',
    [order.id],
  );
  const slots = photos.map((photo) => photo.slot);
  REQUIRED_PHOTO_SLOTS.filter((slot) => !slots.includes(slot)).forEach((slot) =>
    missing.push(`photo:${slot}`),
  );
  if (!order.position_ok) {
    missing.push('position');
  }
  if (!order.device_id) {
    missing.push('device');
  }
  return missing;
};

router.post('/orders/:id/status', loadOrder, async (req, res, next) => {
  try {
    const target = req.body?.status;
    const comment = req.body?.comment;
    const actor = { owner: req.isOwner, reviewer: req.canReview };
    const transition = findTransition(req.order.status, target, actor);

    if (!transition) {
      res.status(409).json({
        message: `Transição ${req.order.status} → ${target} não permitida`,
        allowed: allowedTransitions(req.order.status, actor).map((it) => it.to),
      });
      return;
    }
    if (transition.requiresComment && !comment) {
      res.status(422).send('Comentário é obrigatório para reprovar');
      return;
    }
    if (transition.requiresComplete) {
      const missing = await missingRequirements(req.order);
      if (missing.length) {
        res.status(422).json({ message: 'Ordem incompleta', missing });
        return;
      }
    }

    const reviewed = [STATUS.APPROVED, STATUS.REJECTED].includes(target);
    await execute(
      `UPDATE argos_install_order
       SET status = ?,
           finished_at = CASE WHEN ? = 'concluida' THEN NOW(3) ELSE finished_at END,
           reviewed_by = CASE WHEN ? THEN ? ELSE reviewed_by END,
           reviewed_at = CASE WHEN ? THEN NOW(3) ELSE reviewed_at END,
           review_comment = CASE WHEN ? THEN ? ELSE review_comment END,
           updated_at = NOW(3)
       WHERE id = ?`,
      [
        target,
        target,
        reviewed,
        req.session.userId,
        reviewed,
        reviewed,
        comment || null,
        req.order.id,
      ],
    );
    await audit(req, {
      orderId: req.order.id,
      action: 'status.change',
      fromStatus: req.order.status,
      toStatus: target,
      detail: comment,
    });

    const updated = await queryOne('SELECT * FROM argos_install_order WHERE id = ?', [
      req.order.id,
    ]);
    res.json(await loadDetail(updated));
  } catch (error) {
    next(error);
  }
});

// Integridade: registros sem arquivo e ordens cujo dispositivo não existe mais no Traccar.
router.get('/admin/integrity', requireReviewer, async (req, res, next) => {
  try {
    const orphans = await query(
      'SELECT id, code, device_id FROM argos_install_order WHERE device_missing = 1 LIMIT 200',
    );
    const photos = await query(
      'SELECT COUNT(*) AS total FROM argos_install_photo WHERE deleted_at IS NULL',
    );
    res.json({ devicesMissing: orphans, photos: photos[0]?.total || 0 });
  } catch (error) {
    next(error);
  }
});

export default router;
