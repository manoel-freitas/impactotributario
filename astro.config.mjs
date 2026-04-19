import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { dataFetcherIntegration } from "./src/integrations/data-fetcher.ts";

// ─── Cloudflare Pages deploy target ────────────────────────────
// All .astro pages use `export const prerender = true` → built as static

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