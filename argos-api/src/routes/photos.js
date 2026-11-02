import express from 'express';
import multer from 'multer';
import { execute, queryOne } from '../db.js';
import { loadOrder } from '../auth.js';
import config from '../config.js';
import { PHOTO_SLOTS, isEditable } from '../status.js';
import { absolutePath, processUpload, removeFiles } from '../photos.js';
import { audit } from '../audit.js';

const router = express.Router();

// Memória, não disco: o pipeline do sharp recomprime antes de gravar, então o arquivo cru
// nunca precisa existir em disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

router.post('/orders/:id/photos', loadOrder, upload.single('file'), async (req, res, next) => {
  try {
    if (!isEditable(req.order.status, { reviewer: req.canReview })) {
      res.status(409).send('Ordem concluída: fotos não podem mais ser alteradas');
      return;
    }
    if (!req.file) {
      res.status(400).send('Arquivo ausente');
      return;
    }
    const slot = req.body?.slot;
    if (!PHOTO_SLOTS.includes(slot)) {
      res.status(400).send(`Slot inválido: ${slot}`);
      return;
    }

    // Idempotência: o retry da fila do celular reenvia o mesmo clientPhotoId.
    const clientPhotoId = req.body?.clientPhotoId || null;
    if (clientPhotoId) {
      const existing = await queryOne(
        'SELECT * FROM argos_install_photo WHERE order_id = ? AND client_photo_id = ? AND deleted_at IS NULL',
        [req.order.id, clientPhotoId],
      );
      if (existing) {
        res.json({ id: existing.id, slot: existing.slot, bytes: existing.bytes, reused: true });
        return;
      }
    }

    const count = await queryOne(
      'SELECT COUNT(*) AS total FROM argos_install_photo WHERE order_id = ? AND deleted_at IS NULL',
      [req.order.id],
    );
    if ((count?.total || 0) >= config.maxPhotosPerOrder) {
      res.status(422).send(`Limite de ${config.maxPhotosPerOrder} fotos por ordem atingido`);
      return;
    }

    const processed = await processUpload({
      buffer: req.file.buffer,
      orderId: req.order.id,
      originalName: req.file.originalname,
    });

    const takenAt = req.body?.takenAt ? new Date(req.body.takenAt) : null;
    const result = await execute(
      `INSERT INTO argos_install_photo
         (order_id, slot, position, client_photo_id, path, thumb_path, mime, bytes, width, height,
          sha256, original_name, exif_lat, exif_lon, taken_at, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
      [
        req.order.id,
        slot,
        Number(req.body?.position) || 0,
        clientPhotoId,
        processed.path,
        processed.thumbPath,
        processed.mime,
        processed.bytes,
        processed.width,
        processed.height,
        processed.sha256,
        processed.originalName,
        processed.exifLat,
        processed.exifLon,
        takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt : null,
        req.session.userId,
      ],
    );

    await audit(req, { orderId: req.order.id, action: 'photo.add', detail: slot });
    res.status(201).json({
      id: result.insertId,
      slot,
      bytes: processed.bytes,
      width: processed.width,
      height: processed.height,
      url: `photos/${result.insertId}`,
      thumbUrl: `photos/${result.insertId}${processed.thumbPath ? '/thumb' : ''}`,
    });
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).send(`Arquivo maior que ${Math.round(config.maxUploadBytes / 1024 / 1024)}MB`);
      return;
    }
    if (error.status) {
      res.status(error.status).send(error.message);
      return;
    }
    next(error);
  }
});

// Carrega a foto e reaproveita a autorização da ordem (a URL nunca é a única proteção).
const loadPhoto = async (req, res, next) => {
  try {
    const photo = await queryOne(
      'SELECT * FROM argos_install_photo WHERE id = ? AND deleted_at IS NULL',
      [Number(req.params.photoId)],
    );
    if (!photo) {
      res.status(404).send('Foto não encontrada');
      return;
    }
    req.params.id = String(photo.order_id);
    req.photo = photo;
    loadOrder(req, res, next);
  } catch (error) {
    next(error);
  }
};

const sendPhoto = (req, res, thumb) => {
  const { photo } = req;
  const relative = thumb && photo.thumb_path ? photo.thumb_path : photo.path;
  res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
  res.setHeader('ETag', `"${photo.sha256}${thumb ? '-t' : ''}"`);
  if (req.headers['if-none-match'] === res.getHeader('ETag')) {
    res.status(304).end();
    return;
  }
  res.sendFile(absolutePath(relative), { headers: { 'Content-Type': photo.mime } }, (error) => {
    if (error && !res.headersSent) {
      res.status(410).send('Arquivo da foto não está mais disponível no armazenamento');
    }
  });
};

router.get('/photos/:photoId', loadPhoto, (req, res) => sendPhoto(req, res, false));
router.get('/photos/:photoId/thumb', loadPhoto, (req, res) => sendPhoto(req, res, true));

router.delete('/photos/:photoId', loadPhoto, async (req, res, next) => {
  try {
    if (!isEditable(req.order.status, { reviewer: req.canReview })) {
      res.status(409).send('Ordem concluída: fotos não podem mais ser removidas');
      return;
    }
    await execute('UPDATE argos_install_photo SET deleted_at = NOW(3) WHERE id = ?', [
      req.photo.id,
    ]);
    await removeFiles(req.photo);
    await audit(req, { orderId: req.order.id, action: 'photo.delete', detail: req.photo.slot });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
