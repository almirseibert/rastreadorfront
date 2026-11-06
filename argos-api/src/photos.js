import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import config from './config.js';

// Pipeline de foto: valida pelo conteúdo (não pelo mime declarado), corrige a orientação
// EXIF, extrai GPS/data antes de descartar os metadados, recomprime e gera miniatura.
//
// O caminho gravado no banco é RELATIVO ao STORAGE_DIR, para que trocar o armazenamento
// (volume local -> S3) seja só trocar quem resolve o caminho.

const SUPPORTED = ['jpeg', 'jpg', 'png', 'webp', 'heif', 'heic', 'avif'];

const relativeDir = (orderId, when = new Date()) =>
  path.join(
    'photos',
    String(when.getUTCFullYear()),
    String(when.getUTCMonth() + 1).padStart(2, '0'),
    String(orderId),
  );

export const absolutePath = (relative) => path.join(config.storageDir, relative);

// Converte a referência GPS do EXIF (graus/minutos/segundos + hemisfério) em grau decimal.
const gpsToDecimal = (value, ref) => {
  if (!Array.isArray(value) || value.length < 3) {
    return null;
  }
  const [degrees, minutes, seconds] = value;
  const decimal = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;
  if (!Number.isFinite(decimal)) {
    return null;
  }
  return ref === 'S' || ref === 'W' ? -decimal : decimal;
};

// `metadata.exif` do sharp é um Buffer cru (bloco TIFF), não um objeto: ler
// `metadata.exif.gps` devolve sempre undefined e o GPS nunca era gravado. É preciso
// decodificar o bloco. A falha aqui nunca derruba o upload — a foto importa mais que o EXIF.
const readExif = (raw) => {
  if (!raw || !raw.length) {
    return {};
  }
  try {
    const tags = exifReader(raw) || {};
    const gps = tags.GPSInfo || tags.gps || {};
    const photo = tags.Photo || tags.exif || {};
    const taken = photo.DateTimeOriginal || photo.DateTimeDigitized || tags.Image?.DateTime;
    const date = taken instanceof Date ? taken : taken ? new Date(taken) : null;
    return {
      lat: gpsToDecimal(gps.GPSLatitude, gps.GPSLatitudeRef),
      lon: gpsToDecimal(gps.GPSLongitude, gps.GPSLongitudeRef),
      takenAt: date && !Number.isNaN(date.getTime()) ? date : null,
    };
  } catch {
    return {};
  }
};

export const processUpload = async ({ buffer, orderId, originalName }) => {
  let image = sharp(buffer, { failOn: 'none' });
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw Object.assign(new Error('Arquivo não é uma imagem válida'), { status: 415 });
  }
  if (!metadata.format || !SUPPORTED.includes(metadata.format)) {
    throw Object.assign(new Error(`Formato de imagem não suportado: ${metadata.format}`), {
      status: 415,
    });
  }

  const exif = readExif(metadata.exif);

  const dir = relativeDir(orderId);
  await fs.mkdir(absolutePath(dir), { recursive: true });

  const stamp = crypto.randomBytes(8).toString('hex');
  const fullRelative = path.join(dir, `${stamp}_full.jpg`);
  const thumbRelative = path.join(dir, `${stamp}_thumb.jpg`);

  // `.rotate()` sem argumento aplica a orientação do EXIF — sem isso, fotos de celular
  // chegam giradas 90° no laudo.
  image = image.rotate();

  let full;
  let thumb = null;
  let info;
  try {
    const result = await image
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    full = result.data;
    info = result.info;
    thumb = await sharp(full)
      .resize({ width: 320, height: 320, fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch {
    // Degradação controlada: se o sharp não decodificar (HEIC sem libheif, por exemplo),
    // guarda o original intacto e segue sem miniatura. A prova não pode ser perdida.
    full = buffer;
    info = { width: metadata.width, height: metadata.height };
    thumb = null;
  }

  await fs.writeFile(absolutePath(fullRelative), full);
  if (thumb) {
    await fs.writeFile(absolutePath(thumbRelative), thumb);
  }

  return {
    path: fullRelative,
    thumbPath: thumb ? thumbRelative : null,
    mime: thumb ? 'image/jpeg' : `image/${metadata.format}`,
    bytes: full.length,
    width: info?.width || null,
    height: info?.height || null,
    sha256: crypto.createHash('sha256').update(full).digest('hex'),
    originalName: originalName ? originalName.slice(0, 255) : null,
    exifLat: exif.lat ?? null,
    exifLon: exif.lon ?? null,
    exifTakenAt: exif.takenAt || null,
  };
};

export const removeFiles = async (photo) => {
  await Promise.all(
    [photo.path, photo.thumb_path].filter(Boolean).map(async (relative) => {
      try {
        await fs.unlink(absolutePath(relative));
      } catch {
        // Arquivo já ausente não é erro: o registro é a fonte da verdade.
      }
    }),
  );
};
