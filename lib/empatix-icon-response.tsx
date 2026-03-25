import { ImageResponse } from "next/og";

/**
 * Квадратная иконка PWA / favicon: «E» на тёмном фоне.
 * Без чтения шрифта с диска: на Vercel `node_modules/.../*.woff` часто не попадает
 * в output file tracing — `readFile` давал 500 на `/icon-192` и `/icon-512`.
 * Satori использует встроенный шрифт при отсутствии `fonts`.
 */
export async function createEmpatixIconResponse(size: number): Promise<ImageResponse> {
  const fontSize = Math.round(size * 0.45);

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
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
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
      height: size
    }
  );
}
