import type { CircularAvatarCropParams } from "@/lib/image-crop/circular-avatar-crop-types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    img.src = src;
  });
}

function coverLayout(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number
): { left: number; top: number; scale: number } {
  const scale = Math.max(containerW / naturalW, containerH / naturalH);
  const drawW = naturalW * scale;
  const drawH = naturalH * scale;
  const left = (containerW - drawW) / 2;
  const top = (containerH - drawH) / 2;
  return { left, top, scale };
}

function sampleBilinear(
  data: Uint8ClampedArray,
  cw: number,
  ch: number,
  x: number,
  y: number
): [number, number, number] {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, cw - 1);
  const y1 = Math.min(y0 + 1, ch - 1);
  const fx = x - x0;
  const fy = y - y0;
  const idx = (xi: number, yi: number) => (yi * cw + xi) * 4;

  const i00 = idx(x0, y0);
  const i10 = idx(x1, y0);
  const i01 = idx(x0, y1);
  const i11 = idx(x1, y1);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const r = lerp(
    lerp(data[i00]!, data[i10]!, fx),
    lerp(data[i01]!, data[i11]!, fx),
    fy
  );
  const g = lerp(
    lerp(data[i00 + 1]!, data[i10 + 1]!, fx),
    lerp(data[i01 + 1]!, data[i11 + 1]!, fx),
    fy
  );
  const b = lerp(
    lerp(data[i00 + 2]!, data[i10 + 2]!, fx),
    lerp(data[i01 + 2]!, data[i11 + 2]!, fx),
    fy
  );
  return [r, g, b];
}

/**
 * Квадратный JPEG: внутри круга — фрагмент превью, снаружи — белый фон (как круглый аватар в UI).
 */
export async function exportCircularAvatarCrop(
  imageSrc: string,
  p: CircularAvatarCropParams,
  outputSize: number,
  quality = 0.9
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const { left, top, scale } = coverLayout(
    p.containerW,
    p.containerH,
    p.naturalW,
    p.naturalH
  );

  const cw = Math.max(1, Math.round(p.containerW));
  const ch = Math.max(1, Math.round(p.containerH));

  const stage = document.createElement("canvas");
  stage.width = cw;
  stage.height = ch;
  const sctx = stage.getContext("2d");
  if (!sctx) throw new Error("Canvas 2D недоступен");

  sctx.drawImage(img, left, top, p.naturalW * scale, p.naturalH * scale);
  const srcData = sctx.getImageData(0, 0, cw, ch);

  const out = document.createElement("canvas");
  out.width = outputSize;
  out.height = outputSize;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas 2D недоступен");

  const imgData = octx.createImageData(outputSize, outputSize);
  const d = imgData.data;
  const half = outputSize / 2;

  for (let j = 0; j < outputSize; j++) {
    for (let i = 0; i < outputSize; i++) {
      const o = (j * outputSize + i) * 4;
      const un = (i + 0.5 - half) / half;
      const vn = (j + 0.5 - half) / half;

      if (un * un + vn * vn > 1) {
        d[o] = 255;
        d[o + 1] = 255;
        d[o + 2] = 255;
        d[o + 3] = 255;
        continue;
      }

      const sx = p.cx + un * p.r;
      const sy = p.cy + vn * p.r;

      if (sx < 0 || sy < 0 || sx >= cw - 1 || sy >= ch - 1) {
        d[o] = 255;
        d[o + 1] = 255;
        d[o + 2] = 255;
        d[o + 3] = 255;
        continue;
      }

      const [r, g, b] = sampleBilinear(srcData.data, cw, ch, sx, sy);
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = 255;
    }
  }

  octx.putImageData(imgData, 0, 0);

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Не удалось сформировать изображение")),
      "image/jpeg",
      quality
    );
  });
}
