// Gera as imagens de teste. Rode de dentro de argos-api/ (precisa do sharp instalado):
//   node test/fixtures.mjs /tmp/argos-fixtures
import sharp from 'sharp';
import fs from 'node:fs';

const dir = process.argv[2];
if (!dir) {
  console.error('uso: node test/fixtures.mjs <diretorio>');
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });

// Foto "de celular": paisagem 3000x2000 com orientação EXIF 6 (precisa girar 90°),
// GPS e DateTimeOriginal. No libvips, IFD2 é o bloco EXIF e IFD3 é o GPS.
await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#2a6' } })
  .withMetadata({
    orientation: 6,
    exif: {
      IFD0: { Make: 'Argos', Model: 'Tracker Cam' },
      IFD2: { DateTimeOriginal: '2026:11:06 14:32:10' },
      IFD3: {
        GPSLatitudeRef: 'S',
        GPSLatitude: '27/1 35/1 4812/100',
        GPSLongitudeRef: 'W',
        GPSLongitude: '48/1 32/1 5820/100',
      },
    },
  })
  .jpeg({ quality: 92 })
  .toFile(`${dir}/celular.jpg`);

// JPEG simples, sem EXIF.
await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#357' } })
  .jpeg({ quality: 90 })
  .toFile(`${dir}/foto.jpg`);

// PNG: mime diferente, deve ser aceito (a validação é image/*, pelo conteúdo).
await sharp({ create: { width: 800, height: 600, channels: 3, background: '#36c' } })
  .png()
  .toFile(`${dir}/foto.png`);

// Texto disfarçado de .jpg: deve ser recusado com 415 (validação por conteúdo).
fs.writeFileSync(`${dir}/falsa.jpg`, 'isto nao e uma imagem\n'.repeat(50));

// Acima do limite: ruído incompressível, ~32 MB, para testar o 413.
const w = 6000;
const h = 4000;
const noise = Buffer.alloc(w * h * 3);
for (let i = 0; i < noise.length; i += 1) {
  noise[i] = Math.floor(Math.random() * 256);
}
await sharp(noise, { raw: { width: w, height: h, channels: 3 } })
  .jpeg({ quality: 100 })
  .toFile(`${dir}/gigante.jpg`);

for (const name of ['celular.jpg', 'foto.jpg', 'foto.png', 'falsa.jpg', 'gigante.jpg']) {
  console.log(name, (fs.statSync(`${dir}/${name}`).size / 1048576).toFixed(2), 'MB');
}
