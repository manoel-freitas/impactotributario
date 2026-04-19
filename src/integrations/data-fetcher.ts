import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { fetchAndSaveNews } from "../lib/fetchNews.ts";
import { fetchAndSaveTaxData } from "../lib/fetchTaxData.ts";

// Resolve the `src/generated` directory relative to this file
function resolveGeneratedDir(root: URL): string {
  return join(fileURLToPath(root), "src", "generated");
}

async function runDataFetch(root: URL) {
  const generatedDir = resolveGeneratedDir(root);

  await Promise.allSettled([
    fetchAndSaveNews(generatedDir),
    fetchAndSaveTaxData(generatedDir),
  ]);
}

export function dataFetcherIntegration(): AstroIntegration {
  return {
    name: "reforma-data-fetcher",
    hooks: {
      // Runs before the build starts generating pages
      "astro:build:start": async ({ logger }) => {
        logger.info("🔄 Running data fetcher before build...");
        try {
          // We need the root URL — use process.cwd() as fallback
          const root = new URL(`file://${process.cwd()}/`);
          await runDataFetch(root);
          logger.info("✅ Data fetch complete — build continuing");
        } catch (err) {
          logger.warn(`⚠️ Data fetch failed (using cached data): ${err}`);
        }
      },

      // Also runs on dev server start so local dev always has fresh data
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
