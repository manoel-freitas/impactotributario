import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { dataFetcherIntegration } from "./src/integrations/data-fetcher.ts";

import cloudflare from "@astrojs/cloudflare";

// ─── Primary deploy target: Node.js standalone (Docker/Dokploy/VPS) ────────────
// All .astro pages use `export const prerender = true` → built as static HTML
// Only /api/* routes are server-side (on-demand)
//
// For Cloudflare Pages: swap node() for cloudflare() from @astrojs/cloudflare
// For pure static (no API): set ASTRO_NO_API=1 and remove src/pages/api/

export default defineConfig({
  site: "https://simuladortributario.com.br",

  output: "server",
  adapter: cloudflare(),

  integrations: [
    vue(),
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
    }),
    dataFetcherIntegration(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});