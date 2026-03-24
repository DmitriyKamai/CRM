import { ImageResponse } from "next/og";

/** Tangerine 700 — тот же вес, что для акцента логотипа в layout. */
const TANGERINE_BOLD_WOFF2 =
  "https://fonts.gstatic.com/s/tangerine/v18/Iurd6Y5j_oScZZow4VO5srNZi5FNym499g.woff2";

let fontPromise: Promise<ArrayBuffer> | null = null;

function getTangerineBoldArrayBuffer(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = fetch(TANGERINE_BOLD_WOFF2).then(r => {
      if (!r.ok) throw new Error("Не удалось загрузить шрифт Tangerine");
      return r.arrayBuffer();
    });
  }
  return fontPromise;
}

/** Квадратная иконка: буква «E» на фоне neutral-950 (как тёмная тема). */
export async function createEmpatixIconResponse(size: number): Promise<ImageResponse> {
  const fontData = await getTangerineBoldArrayBuffer();
  const fontSize = Math.round(size * 0.56);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "Tangerine",
          fontSize,
          fontWeight: 700,
          lineHeight: 1
        }}
      >
        E
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [
        {
          name: "Tangerine",
          data: fontData,
          style: "normal",
          weight: 700
        }
      ]
    }
  );
}
