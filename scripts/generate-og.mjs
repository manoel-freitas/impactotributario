/**
 * Converte public/og-image.svg → public/og-image.png (1200×630)
 * Executado antes do build: "node scripts/generate-og.mjs"
 * Requer: sharp (já disponível como dependência do Node.js)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../public/og-image.svg");
const pngPath = resolve(__dirname, "../public/og-image.png");

const svgBuffer = readFileSync(svgPath);

await sharp(svgBuffer)
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(pngPath);

console.log("✓ og-image.png gerado com sucesso (1200×630)");
