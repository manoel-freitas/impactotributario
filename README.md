# ⚖️ Simulador da Reforma Tributária

Ferramenta web pública, SEO-first, zero manutenção editorial para o empresário brasileiro
entender o impacto da CBS e IBS no seu negócio.

**Stack:** Astro 5 · Vue 3 (islands) · Tailwind CSS v4 · DaisyUI 5 · TypeScript

---

## 🚀 Quickstart

```bash
npm install
npm run dev
```

O servidor de desenvolvimento roda em `http://localhost:4321`.  
Na inicialização, o **data fetcher** busca notícias RSS e valida os dados tributários automaticamente.

---

## 📁 Estrutura do projeto

```
src/
├── components/
│   ├── Simulator.vue          # Wizard interativo (Vue island)
│   ├── SimulatorResult.vue    # Resultado com timeline e projeções
│   └── NewsSection.astro      # Cards de notícias (static)
├── data/
│   └── reforma-base.json      # Dados tributários base (LC 214/2025)
├── generated/                 # Criado em build time (não comitar JSON)
│   ├── news.json              # Notícias buscadas dos RSS feeds
│   └── tax-data.json          # Dados tributários resolvidos
├── integrations/
│   └── data-fetcher.ts        # Astro integration: hook de build
├── layouts/
│   └── BaseLayout.astro       # Layout base com SEO e schema markup
├── lib/
│   ├── types.ts               # TypeScript types
│   ├── taxCalculator.ts       # Lógica de cálculo do simulador
│   ├── fetchNews.ts           # Busca notícias de feeds RSS
│   └── fetchTaxData.ts        # Busca dados tributários remotos
├── pages/
│   ├── index.astro            # Home: simulador + cronograma + notícias + FAQ
│   ├── mei.astro              # Guia MEI e a Reforma
│   ├── simples-nacional.astro # Guia Simples Nacional
│   └── cronograma.astro       # Timeline 2026–2033
└── styles/
    └── global.css             # Tailwind v4 + DaisyUI
```

---

## 🔄 Como o data fetcher funciona

O **Astro integration** em `src/integrations/data-fetcher.ts` se conecta ao
ciclo de build e de dev do Astro via hooks:

| Hook | Quando roda |
|---|---|
| `astro:build:start` | Antes das páginas serem geradas no `npm run build` |
| `astro:server:setup` | Quando o servidor de dev inicia (`npm run dev`) |

Em cada execução, o fetcher:
1. Busca notícias de múltiplos feeds RSS (Google News, Contábeis)
2. Valida e salva em `src/generated/news.json`
3. Tenta buscar dados tributários de `REFORMA_DATA_URL` (se configurado)
4. Salva em `src/generated/tax-data.json` (fallback: base JSON bundled)

As páginas Astro importam esses arquivos com `import ... from "../generated/..."`.

---

## 🌐 Deploy

### Cloudflare Pages (recomendado)

```bash
# Build command
npm run build

# Output directory
dist/

# Environment variables
REFORMA_DATA_URL=  # opcional
```

### Vercel / Netlify

Funciona igual. Configure `npm run build` como build command e `dist/` como output.

---

## ♻️ Rebuild agendado (notícias frescas)

O arquivo `.github/workflows/scheduled-rebuild.yml` dispara um rebuild diário via
webhook do seu host. Configure o secret `CF_DEPLOY_HOOK` no repositório GitHub:

```
GitHub repo > Settings > Secrets and variables > Actions > New repository secret
Name:  CF_DEPLOY_HOOK
Value: (URL do deploy hook do Cloudflare Pages)
```

Para obter o deploy hook no Cloudflare Pages:
`Pages > seu projeto > Settings > Builds & deployments > Deploy hooks`

---

## 🗂️ Atualizar os dados tributários

### Opção A — Atualizar o JSON bundled (simples)

Edite `src/data/reforma-base.json` e faça commit. O próximo build usará os novos dados.

### Opção B — Dados remotos via GitHub Gist (recomendado para atualizações frequentes)

1. Crie um Gist público em `gist.github.com` com o conteúdo de `reforma-base.json`
2. Copie a URL raw do Gist (ex: `https://gist.githubusercontent.com/.../.../raw/...`)
3. Defina `REFORMA_DATA_URL=<url>` nas variáveis de ambiente do seu host
4. O próximo build buscará os dados atualizados automaticamente

Isso permite atualizar alíquotas e regras sem alterar o código do projeto.

---

## 💰 Monetização

Procure os comentários `<!-- Ad placement -->` em `src/pages/index.astro`
para ativar os banners do Google AdSense. Estão desativados por padrão para
facilitar a aprovação do site.

---

## 📊 SEO

- Schema markup: `WebApplication` (global) + `FAQPage` (index)
- Sitemap: configure `@astrojs/sitemap` quando quiser gerar automaticamente
- URLs semânticas por persona: `/mei`, `/simples-nacional`, `/cronograma`

---

## ⚠️ Disclaimer legal

Esta ferramenta é educacional e baseada na EC 132/2023 e LC 214/2025.
Os resultados são estimativas — não constituem consultoria tributária.
Consulte um contador para decisões fiscais.
