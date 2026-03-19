/**
 * Парсит текст опросника СМИЛ с Psylab (формат "N. Текст утверждения" по строкам).
 * Использование: node scripts/parse-smil-psylab.js <input.txt> <output.json>
 */

(async () => {
  // Dynamic imports to avoid `require()` (eslint rule `@typescript-eslint/no-require-imports`).
  const fsMod = await import("fs");
  const pathMod = await import("path");
  const fs = fsMod.default ?? fsMod;
  const path = pathMod.default ?? pathMod;

  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error("Usage: node parse-smil-psylab.js <input.txt> <output.json>");
    process.exit(1);
  }

  const content = fs.readFileSync(path.resolve(inputPath), "utf8");
  const lines = content.split(/\r?\n/);
  const items = [];

  const re = /^(\d+)\.\s*(.+)$/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      const index = parseInt(m[1], 10);
      const text = m[2].trim();
      if (index >= 1 && index <= 566) {
        items.push({ index, text });
      }
    }
  }

  items.sort((a, b) => a.index - b.index);
  fs.writeFileSync(
    path.resolve(outputPath),
    JSON.stringify(items, null, 0),
    "utf8"
  );
  console.log(`Written ${items.length} items to ${outputPath}`);
})().catch((e) => {
  console.error("Fatal error:", e?.message ?? e);
  process.exit(1);
});
