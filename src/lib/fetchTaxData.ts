import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ReformaData } from "./types.ts";
import { fetchCbsOfficialRates } from "./fetchCbsOfficialRates.ts";

// ─── Remote data source ───────────────────────────────────────────────────────
// You can host the JSON in a GitHub Gist or any public URL.
// This allows updating tax data without redeploying app code.
// Leave empty or set REFORMA_DATA_URL env var to use remote data.
const REMOTE_DATA_URL =
  process.env.REFORMA_DATA_URL ||
  // Default: use a public GitHub Gist (replace with your own Gist URL)
  "";

// ─── Fetch remote data ────────────────────────────────────────────────────────
async function fetchRemoteData(url: string): Promise<ReformaData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`  ✗ Remote data returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as ReformaData;

    // Basic validation
    if (
      !data.version ||
      !data.transition ||
      !data.sectorReductions ||
      !data.regimeRules ||
      !data.currentRates
    ) {
      console.warn("  ✗ Remote data failed validation (missing required fields)");
      return null;
    }

    return data;
  } catch (err) {
    console.warn("  ✗ Failed to fetch remote data:", err);
    return null;
  }
}

// ─── Load base data (bundled in repo) ────────────────────────────────────────
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

// ─── Main: resolve data (CBS API > remote > local fallback) ─────────────────────────────
export async function fetchAndSaveTaxData(outputDir: string): Promise<void> {
  console.log("📊 Resolving tax reform data...");

  let data: ReformaData;

  // Priority 1: Try CBS official API
  console.log("  ↳ Trying CBS official API (dados-abertos)...");
  const official = await fetchCbsOfficialRates();

  if (official) {
    console.log(`  ✓ Using CBS official data v${official.version} (${official.lastUpdated})`);
    data = official;
  } else if (REMOTE_DATA_URL) {
    // Priority 2: Remote URL from env
    console.log("  ↳ Trying remote source:", REMOTE_DATA_URL);
    const remote = await fetchRemoteData(REMOTE_DATA_URL);

    if (remote) {
      console.log(`  ✓ Using remote data v${remote.version} (${remote.lastUpdated})`);
      data = remote;
    } else {
      console.log("  ↳ Falling back to bundled base data");
      data = loadBaseData();
    }
  } else {
    // Priority 3: Bundled fallback
    console.log("  ↳ No remote URL — using bundled base data");
    data = loadBaseData();
  }

  // Stamp fetch time
  data = { ...data, lastUpdated: data.lastUpdated };

  mkdirSync(outputDir, { recursive: true });
  const outPath = join(outputDir, "tax-data.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Tax data saved → ${outPath} (v${data.version})`);
}
