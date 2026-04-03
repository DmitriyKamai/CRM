/**
 * Квадратный canvas (кроп из CircleStencil) → JPEG с белыми углами за пределами круга.
 */
export async function squareCanvasToCircularJpegBlob(
  squareCanvas: HTMLCanvasElement,
  outputSize: number,
  quality = 0.9
): Promise<Blob> {
  const out = document.createElement("canvas");
  out.width = outputSize;
  out.height = outputSize;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D недоступен");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.save();
  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(
    squareCanvas,
    0,
    0,
    squareCanvas.width,
    squareCanvas.height,
    0,
    0,
    outputSize,
    outputSize
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Не удалось сформировать изображение")),
      "image/jpeg",
      quality
    );
  });
}
