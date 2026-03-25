import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fontPath = path.join(
  root,
  "node_modules",
  "@fontsource",
  "tangerine",
  "files",
  "tangerine-latin-700-normal.woff2"
);
const b64 = fs.readFileSync(fontPath).toString("base64");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Empatix">
  <!-- Tangerine 700 (SIL OFL), @fontsource/tangerine — глиф «E» через data URI, без readFile на рантайме -->
  <defs>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: "EmpatixIcon";
        font-style: normal;
        font-weight: 700;
        font-display: block;
        src: url("data:font/woff2;base64,${b64}") format("woff2");
      }
      .e {
        font-family: "EmpatixIcon", "Tangerine", cursive;
        font-size: 320px;
        font-weight: 700;
        fill: #fafafa;
      }
    ]]></style>
  </defs>
  <rect width="512" height="512" fill="#0a0a0a"/>
  <text x="256" y="300" text-anchor="middle" dominant-baseline="central" class="e">E</text>
</svg>
`;

const out = path.join(root, "app", "icon.svg");
fs.writeFileSync(out, svg, "utf8");
console.log("Wrote", out, "chars", svg.length);
