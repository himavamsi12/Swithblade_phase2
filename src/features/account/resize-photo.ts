/*
 * Shrinks a photo in the browser before it's uploaded with a return
 * request: phone photos are often 3–8 MB, more than a request can carry.
 * The result is a JPEG at most MAX_SIDE pixels on its longest side.
 */

const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function resizePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas not available");
  // JPEG has no transparency: put PNG cut-outs on white, not black.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("Couldn't read this picture");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}
