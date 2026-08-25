// Comprime una foto en el propio dispositivo antes de subirla: solo hace
// falta reconocer el objeto de un vistazo, no guardar una foto en alta
// resolución, así que la reducimos a una miniatura ligera (JPEG).
export async function compressImageToDataUrl(file: File, maxWidth = 640, quality = 0.7): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}
