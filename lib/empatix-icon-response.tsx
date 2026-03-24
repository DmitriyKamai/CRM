import { readFile } from "fs/promises";
import { join } from "path";

import { ImageResponse } from "next/og";

/**
 * Tangerine 700 из @fontsource/tangerine.
 * ImageResponse (Satori) не поддерживает WOFF2 — только WOFF/TTF.
 */
let fontPromise: Promise<ArrayBuffer> | null = null;

function getTangerineBoldArrayBuffer(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = readFile(
      join(
        process.cwd(),
        "node_modules/@fontsource/tangerine/files/tangerine-latin-700-normal.woff"
      )
    ).then(buf => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
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
