(async () => {
  // Dynamic imports to avoid `require()` (eslint rule `@typescript-eslint/no-require-imports`).
  const fsMod = await import("fs");
  const pathMod = await import("path");
  const fs = fsMod.default ?? fsMod;
  const path = pathMod.default ?? pathMod;

  const src = path.join(
    __dirname,
    "../agent-tools/80f833fd-99e2-4e36-99af-1cb3b5dd68e1.txt"
  );
  const agentPath = path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/d-CRM/agent-tools/80f833fd-99e2-4e36-99af-1cb3b5dd68e1.txt"
  );

  let raw;
  try {
    raw = fs.readFileSync(agentPath, "utf8");
  } catch {
    raw = fs.readFileSync(src, "utf8");
  }
  const data = JSON.parse(raw);
  const names = data.map((c) => c.name);
  fs.writeFileSync(
    path.join(__dirname, "../lib/data/russian-cities.json"),
    JSON.stringify(names)
  );
  console.log("Written", names.length, "cities");
})().catch((e) => {
  console.error("Fatal error:", e?.message ?? e);
  process.exit(1);
});
