import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ReformaData } from "./types.ts";
import { fetchCbsOfficialRates } from "./fetchCbsOfficialRates.ts";

function loadBaseData(): ReformaData {
  const basePath = new URL("../data/reforma-base.json", import.meta.url);
  let raw: string;
  try {
    raw = readFileSync(basePath, "utf-8");
  } catch (err) {
    throw new Error(`Bundled tax data not found: ${err}`);
  }
  try {
    return JSON.parse(raw) as ReformaData;
  } catch (err) {
    throw new Error(`Invalid JSON in bundled tax data: ${err}`);
  }
}

export async function fetchAndSaveTaxData(outputDir: string): Promise<void> {
  console.log("📊 Resolving tax reform data...");

  let data: ReformaData;

  console.log("  ↳ Trying CBS official API (dados-abertos)...");
  const official = await fetchCbsOfficialRates();

  if (official) {
    console.log(`  ✓ Using CBS official data v${official.version} (${official.lastUpdated})`);
    data = official;
  } else {
    console.log("  ↳ CBS API failed — using bundled base data");
    data = loadBaseData();
  }

  // Stamp fetch time
  data = { ...data, lastUpdated: data.lastUpdated };

  mkdirSync(outputDir, { recursive: true });
  const outPath = join(outputDir, "tax-data.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Tax data saved → ${outPath} (v${data.version})`);
}
