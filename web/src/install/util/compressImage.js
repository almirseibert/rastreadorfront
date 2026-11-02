// Comprime a foto no próprio celular antes do upload: economiza banda em 3G, que é o cenário
// real do instalador em campo. É otimização, não requisito — qualquer falha cai no arquivo
// original, porque o argos-api recomprime de qualquer forma.
const MAX_SIDE = 1600;
const QUALITY = 0.75;

const compressImage = async (file) => {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    let blob;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    }
    bitmap.close?.();
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
};

export default compressImage;
