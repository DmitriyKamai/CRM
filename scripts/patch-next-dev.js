// Patches next-dev.js to auto-restart on V8 native crash (0xC0000005)
// This works around a V8 bug on Windows during intensive JIT compilation in dev mode.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "node_modules", "next", "dist", "cli", "next-dev.js");

if (!fs.existsSync(file)) {
  console.log("next-dev.js not found, skipping patch");
  process.exit(0);
}

let src = fs.readFileSync(file, "utf8");

const marker = "// auto-restart-on-v8-crash";
if (src.includes(marker)) {
  console.log("next-dev.js already patched");
  process.exit(0);
}

const target = "if (code === _utils.RESTART_EXIT_CODE) {";
const idx = src.indexOf(target);
if (idx === -1) {
  console.log("Could not find insertion point in next-dev.js, skipping patch");
  process.exit(0);
}

const patch = `${marker}
                if (code === 3221225477) {
                    console.error('\\x1b[33m⚠ Dev server crashed (native V8 error). Auto-restarting...\\x1b[0m');
                    return startServer({
                        ...startServerOptions,
                        port
                    });
                }
                `;

src = src.slice(0, idx) + patch + src.slice(idx);
fs.writeFileSync(file, src, "utf8");
console.log("Patched next-dev.js: auto-restart on V8 crash (0xC0000005)");
