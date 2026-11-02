import express from 'express';
import { execute, query, queryOne } from '../db.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

const withItems = async (template) => ({
  ...template,
  items: await query('SELECT * FROM argos_checklist_item WHERE template_id = ? ORDER BY position', [
    template.id,
  ]),
});

router.get('/templates', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.active !== undefined) {
      conditions.push('active = ?');
      params.push(req.query.active === 'false' ? 0 : 1);
    }
    if (req.query.category) {
      // Cai no modelo genérico (category NULL) quando não houver um específico da categoria.
      conditions.push('(category = ? OR category IS NULL)');
      params.push(req.query.category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const templates = await query(
      `SELECT * FROM argos_checklist_template ${where} ORDER BY category IS NULL, name`,
      params,
    );
    res.json(await Promise.all(templates.map(withItems)));
  } catch (error) {
    next(error);
  }
});

router.get('/templates/:id', async (req, res, next) => {
  try {
    const template = await queryOne('SELECT * FROM argos_checklist_template WHERE id = ?', [
      Number(req.params.id),
    ]);
    if (!template) {
      res.status(404).send('Modelo não encontrado');
      return;
    }
    res.json(await withItems(template));
  } catch (error) {
    next(error);
  }
});

const saveItems = async (templateId, items) => {
  await execute('DELETE FROM argos_checklist_item WHERE template_id = ?', [templateId]);
  let position = 0;
  for (const item of items || []) {
    if (!item.label) {
      continue;
    }
    position += 1;
    await execute(
      'INSERT INTO argos_checklist_item (template_id, position, label, help, required) VALUES (?, ?, ?, ?, ?)',
      [templateId, position, item.label, item.help || null, item.required === false ? 0 : 1],
    );
  }
};

router.post('/templates', requireAdmin, async (req, res, next) => {
  try {
    const { name, category, active = true, items } = req.body || {};
    if (!name) {
      res.status(400).send('Nome é obrigatório');
      return;
    }
    const result = await execute(
      `INSERT INTO argos_checklist_template (name, category, active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(3), NOW(3))`,
      [name, category || null, active ? 1 : 0, req.session.userId],
    );
    await saveItems(result.insertId, items);
    const template = await queryOne('SELECT * FROM argos_checklist_template WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json(await withItems(template));
  } catch (error) {
    next(error);
  }
});

router.put('/templates/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const template = await queryOne('SELECT * FROM argos_checklist_template WHERE id = ?', [id]);
    if (!template) {
      res.status(404).send('Modelo não encontrado');
      return;
    }
    const { name, category, active, items } = req.body || {};
    await execute(
      `UPDATE argos_checklist_template
       SET name = ?, category = ?, active = ?, updated_at = NOW(3) WHERE id = ?`,
      [
        name || template.name,
        category === undefined ? template.category : category || null,
        active === undefined ? template.active : active ? 1 : 0,
        id,
      ],
    );
    if (items) {
      // Itens já respondidos em ordens antigas ficam preservados: as respostas guardam
      // label_snapshot, então reescrever o modelo não altera laudos emitidos.
      await saveItems(id, items);
    }
    const updated = await queryOne('SELECT * FROM argos_checklist_template WHERE id = ?', [id]);
    res.json(await withItems(updated));
  } catch (error) {
    next(error);
  }
});

router.delete('/templates/:id', requireAdmin, async (req, res, next) => {
  try {
    await execute('DELETE FROM argos_checklist_template WHERE id = ?', [Number(req.params.id)]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
