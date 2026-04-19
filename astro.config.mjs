import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { dataFetcherIntegration } from "./src/integrations/data-fetcher.ts";
import partytown from "@astrojs/partytown";

// ─── Cloudflare Pages deploy target ────────────────────────────
// All .astro pages use `export const prerender = true` → built as static

export default defineConfig({
  site: "https://impactotributario.com",

  output: "server",
  adapter: cloudflare({
    prerenderEnvironment: "node",
  }),

integrations: [
    vue(),
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
    }),
    partytown({
      config: {
        forward: ["dataLayer.push", "gtag"],
        resolveUrl(url) {
          if (url.hostname === "www.googletagmanager.com") {
            const proxy = new URL("https://impactotributario.com/~partytown/proxy");
            proxy.searchParams.append("url", url.href);
            return proxy;
          }
          return url;
        },
      },
    }),   
    dataFetcherIntegration(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});