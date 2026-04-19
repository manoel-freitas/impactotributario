# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # instalar dependências
npm run dev       # servidor de dev em http://localhost:4321
npm run build     # build de produção (gera dist/)
npm run preview   # preview do build local
```

Não há test runner configurado no projeto.

## Arquitetura

**Stack:** Astro 5 (SSR via Node.js adapter) · Vue 3 (islands) · Tailwind CSS v4 · DaisyUI 5 · TypeScript

### Modo de render

`output: "server"` com adapter Node.js standalone. Todas as páginas `.astro` usam `export const prerender = true` — geradas como HTML estático no build. Somente `src/pages/api/` é server-side (on-demand).

### Fluxo de dados no build

O `dataFetcherIntegration()` em `src/integrations/data-fetcher.ts` hooks nos eventos do Astro:
- `astro:build:start` → antes de gerar páginas no `npm run build`
- `astro:server:setup` → ao iniciar `npm run dev`

Em cada execução, busca RSS e dados tributários remotos, gravando em `src/generated/`:
- `news.json` — notícias dos feeds RSS
- `tax-data.json` — dados tributários (fallback: `src/data/reforma-base.json`)

As páginas Astro importam esses arquivos estáticos com `import ... from "../generated/..."`.

### Lógica de cálculo (`src/lib/taxCalculator.ts`)

Função pública `calculate(input, data)` recebe `SimulatorInput` e `ReformaData`, retorna `SimulatorResult`. Internamente:
- Compara carga atual (PIS+COFINS+ISS/ICMS) com carga futura CBS+IBS por ano (2026–2033)
- Multiplica alíquotas por `REGIME_CBS_MULT` / `REGIME_IBS_MULT` e pelo `reductionFactor` do setor
- Classifica impacto (`exempt | low | medium | high | benefit`) com base no `deltaPercent` de 2033

### Tipos centrais (`src/lib/types.ts`)

`SimulatorInput` → `SimulatorResult` com `YearProjection[]` por ano de transição. `ReformaData` é a estrutura do JSON de dados tributários (lido de `src/generated/tax-data.json` ou `src/data/reforma-base.json`).

### Componentes interativos (Vue islands)

- `Simulator.vue` — wizard de entrada (regime, setor, faturamento mensal)
- `SimulatorResult.vue` — exibe projeções, ações recomendadas e FAQs dinâmicos por perfil

### Variável de ambiente

`REFORMA_DATA_URL` (opcional) — URL de JSON remoto com dados tributários atualizados. Se não definida, usa o JSON bundled. Copie `.env.example` para `.env`.

### Atualizar dados tributários

- **Simples:** editar `src/data/reforma-base.json` e fazer commit
- **Sem commit:** definir `REFORMA_DATA_URL` apontando para um Gist público com o mesmo schema de `ReformaData`

### Deploy agendado

`.github/workflows/scheduled-rebuild.yml` dispara rebuild diário via webhook (`CF_DEPLOY_HOOK` secret). Mantém notícias frescas sem intervenção manual.

---

## Design Context

### Users

**Primary persona: João (MEI)** — microentrepreneur, no accounting background, mobile phone, time pressure. Wants a yes/no answer in under 60 seconds: "Will the reform raise my taxes?" No forms, no jargon, no login.

Secondary personas: Ana (Simples Nacional), Carlos (Lucro Presumido), Marina (accountant sharing results with clients).

**Job to be done:** Understand personal fiscal impact of Brazil's 2026–2033 tax reform quickly, without needing an accountant.

### Brand Personality

**Three words: Acessível · Direto · Honesto** (Accessible · Direct · Honest)

- **Acessível** — plain Portuguese, emoji-assisted labels, 60-second promise
- **Direto** — data first, no marketing fluff, no lead-gen friction
- **Honesto** — mandatory disclaimers, "estimate" framing, politically neutral

**Emotional goal after using the simulator:** Informed confidence — "I now understand exactly how this affects me."

### Aesthetic Direction

**Visual metaphor: "Civic Fintech"** — credibility of an official Brazilian civic document + clarity of Nubank/Guiabolso.

**References:** ✅ Nubank / Guiabolso (clean, high-contrast, information-dense)

**Anti-references:**
- ❌ Lead-gen landing pages (conversion funnel CTAs)
- ❌ Generic SaaS dashboards (blue gradients, growth metrics aesthetics)
- ❌ Playful / gamified UI (confetti, cartoon elements, bright accent overload)
- ❌ Heavy government bureaucracy (dense grey portals, wall-of-text forms)

**Color roles:**
- Navy `#001E40` — authority, nav, footer, primary buttons
- Emerald `#006C4B` — action, CTA, positive data
- Warm off-white `#FBF9F9` — "paper document" background
- Slate blue `#5E6F83` — neutral data, secondary info
- Mint `#9AF5CA` / `#057351` — icon highlights only, never overused

**Typography:** Public Sans. Headlines: extrabold, tight tracking. Body: regular, relaxed leading. Numbers: font-mono bold.

**Theme:** Light mode is canonical. Dark mode supported as OS-preference variant.

**Shape:** Flat cards, `rounded-md` (8px), no decorative shadows. Borders at `#C3C6D1` 20% opacity.

### Design Principles

1. **Trust before delight.** Credibility and neutrality first. Delight is earned — never imposed.
2. **Data is the hero.** UI chrome exists to frame data, not compete with it.
3. **Accessible to João, useful to Marina.** Design for lowest-literacy persona first. 60 seconds on mobile.
4. **Civic restraint.** Narrow palette with defined semantic roles. Do not add colors casually.
5. **Honest friction.** Three clear wizard steps + explicit disclaimers preserve the intellectual honesty that differentiates this tool.
