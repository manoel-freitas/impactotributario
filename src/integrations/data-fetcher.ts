import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { fetchAndSaveTaxData } from "../lib/fetchTaxData.ts";

function resolveGeneratedDir(root: URL): string {
  return join(fileURLToPath(root), "src", "generated");
}

async function runDataFetch(root: URL) {
  const generatedDir = resolveGeneratedDir(root);
  await fetchAndSaveTaxData(generatedDir);
}

export function dataFetcherIntegration(): AstroIntegration {
  return {
    name: "reforma-data-fetcher",
    hooks: {
      "astro:build:start": async ({ logger }) => {
        logger.info("🔄 Running data fetcher before build...");
        try {
          const root = new URL(`file://${process.cwd()}/`);
          await runDataFetch(root);
          logger.info("✅ Data fetch complete — build continuing");
        } catch (err) {
          logger.warn(`⚠️ Data fetch failed (using cached data): ${err}`);
        }
      },

      "astro:server:setup": async ({ logger }) => {
        logger.info("🔄 Running data fetcher for dev server...");
        try {
          const root = new URL(`file://${process.cwd()}/`);
          await runDataFetch(root);
          logger.info("✅ Dev data fetch complete");
        } catch (err) {
          logger.warn(`⚠️ Dev data fetch failed: ${err}`);
        }
      },
    },
  };
}