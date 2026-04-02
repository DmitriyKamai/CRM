export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    img.src = src;
  });
}

function normalizeCrop(c: PixelCrop): PixelCrop {
  return {
    x: Math.max(0, Math.round(c.x)),
    y: Math.max(0, Math.round(c.y)),
    width: Math.max(1, Math.round(c.width)),
    height: Math.max(1, Math.round(c.height))
  };
}

/**
 * Вырезает область в натуральных пикселях исходника и масштабирует в квадрат outputSize (JPEG).
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize: number,
  quality = 0.9
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const crop = normalizeCrop(pixelCrop);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D недоступен");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Не удалось сформировать изображение")),
      "image/jpeg",
      quality
    );
  });
}
