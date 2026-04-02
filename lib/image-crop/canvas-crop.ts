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

export type CroppedImageOptions = {
  /** Круглая маска (как круглый аватар); углы JPEG заливаются белым. */
  circular?: boolean;
  quality?: number;
};

/**
 * Вырезает область в натуральных пикселях исходника и масштабирует в квадрат outputSize (JPEG).
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize: number,
  options?: CroppedImageOptions | number
): Promise<Blob> {
  const opts: CroppedImageOptions =
    typeof options === "number" ? { quality: options } : (options ?? {});
  const quality = opts.quality ?? 0.9;
  const circular = opts.circular ?? false;

  const image = await loadImage(imageSrc);
  const crop = normalizeCrop(pixelCrop);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D недоступен");

  if (circular) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

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

  if (circular) {
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Не удалось сформировать изображение")),
      "image/jpeg",
      quality
    );
  });
}
