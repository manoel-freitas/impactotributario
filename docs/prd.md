# PRD — Simulador da Reforma Tributária
**Versão:** 2.0 (pós-implementação)
**Data:** Abril 2026
**Status:** MVP implementado e validado
**Repositório:** `reforma-tributaria/` (zip entregue)

---

## 1. Contexto e Problema

### 1.1 O que está acontecendo

A maior reforma tributária brasileira em 30 anos entrou em vigor em Janeiro 2026.
A **LC 214/2025** substituirá gradualmente 5 tributos (PIS, COFINS, ICMS, ISS e IPI)
por 2 novos: **CBS** (federal) e **IBS** (estadual/municipal), formando o **IVA Dual**.
A transição é gradual e vai até **2033** — gerando 7 anos de buscas orgânicas intensas.

**Cronograma implementado no produto:**

| Ano | Fase | CBS | IBS | O que muda |
|-----|------|-----|-----|------------|
| 2026 | Teste | 0,9% | 0,1% | Aparece na NF, **sem cobrança efetiva** |
| 2027 | Transição | 8,4% | 0% | CBS plena. PIS/COFINS zerados |
| 2028 | Transição | 8,4% | 0% | CBS estabilizada |
| 2029 | Transição | 8,4% | 2,6% | IBS inicia. ICMS/ISS −10% |
| 2030 | Transição | 8,4% | 5,2% | ICMS/ISS −20% acumulado |
| 2031 | Transição | 8,4% | 7,8% | ICMS/ISS −30% acumulado |
| 2032 | Transição | 8,4% | 10,4% | ICMS/ISS −40% acumulado |
| 2033 | Final | 8,4% | 17,6% | Transição completa. 5 tributos extintos |

### 1.2 O problema validado

- **83% dos empreendedores** têm pouco ou nenhum conhecimento sobre a reforma (Conta Azul)
- **95% das empresas** cometem erros na apuração de tributos hoje (IBPT)
- **58% se preocupam** com aumento de carga tributária
- Todas as ferramentas existentes têm interesse comercial embutido ou são inacessíveis para não-contadores

### 1.3 Gap de mercado confirmado

| Ferramenta existente | Problema |
|---|---|
| Receita Federal (oficial) | Exige NCM/NBS, login gov.br, extremamente técnica |
| Conta Azul | Captura de lead obrigatória, focada em vender ERP |
| OSP Contabilidade | Lead gen para escritório contábil, não é neutro |
| Fortes Tecnologia | Só para assinantes pagos do software |
| IOB | Só para assinantes pagos |
| HyperHub calculator | Foco em vender consultoria, UX básica |

**Nenhuma** é simultaneamente: neutra, sem login, sem NCM, visual, para não-contadores e SEO-first.

---

## 2. Produto Construído

### 2.1 Proposta de valor

> **"Descubra em 60 segundos se a Reforma Tributária vai aumentar seus impostos — sem NCM, sem login, sem juridiquês."**

### 2.2 O que foi entregue (MVP completo)

**6 páginas públicas:**

| URL | Tipo | Conteúdo |
|-----|------|----------|
| `/` | SSG + Vue island | Simulador, cronograma, notícias, FAQ |
| `/mei` | SSG | Guia MEI e a reforma. SEO: "MEI reforma tributária" |
| `/simples-nacional` | SSG | Guia Simples Nacional. SEO: "simples nacional cbs ibs" |
| `/cronograma` | SSG | Timeline 2026–2033 completo |
| `/glossario` | SSG | 15 termos definidos com schema DefinedTermSet |
| `/404` | SSG | Página de erro customizada |

**1 API REST:**

| Endpoint | Método | Função |
|----------|--------|--------|
| `POST /api/simulate` | Server-side | Simulação completa, JSON, CORS, rate limit 60 req/min |
| `GET /api/simulate` | Server-side | Documentação da API em JSON |
| `OPTIONS /api/simulate` | Server-side | CORS preflight |

---

## 3. Arquitetura Técnica

### 3.1 Stack

| Camada | Tecnologia | Versão | Decisão |
|--------|-----------|--------|---------|
| Framework | Astro | 5.18 | SSG nativo, islands architecture, performance máxima |
| UI interativa | Vue 3 | 3.5 | Islands: só o simulador é client-side |
| Adapter | @astrojs/vue | 6.0.1 | Bridge Astro ↔ Vue |
| CSS | Tailwind CSS | v4.1 | CSS-first config, sem `tailwind.config.js` |
| Componentes | DaisyUI | 5.5.19 | `@plugin "daisyui"` no CSS global |
| Vite plugin | @tailwindcss/vite | 4.1 | Integração Tailwind v4 com Vite |
| Deploy adapter | @astrojs/node | 9.5.5 | Standalone server para Docker/VPS |
| Sitemap | @astrojs/sitemap | 3.7.2 | Gera `sitemap-index.xml` no build |
| Linguagem | TypeScript | 5.7 | Tipos compartilhados em `src/lib/types.ts` |

### 3.2 Diagrama de arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                            │
│                                                                     │
│  .github/workflows/scheduled-rebuild.yml                            │
│  └── Cron diário 07:00 UTC → POST webhook → trigger rebuild         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ push / webhook
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     npm run build (Astro 5)                         │
│                                                                     │
│  1. astro:build:start hook                                          │
│     └── dataFetcherIntegration()                                    │
│         ├── fetchNews()      → Google News RSS + Contábeis RSS      │
│         │   └── src/generated/news.json     (0–18 itens)            │
│         └── fetchTaxData()   → REFORMA_DATA_URL || base JSON        │
│             └── src/generated/tax-data.json  (v1.3)                 │
│                                                                     │
│  2. Astro gera páginas (SSG) — todas com prerender = true           │
│     ├── / (index.astro)         imports generated/tax-data.json     │
│     │   imports generated/news.json                                 │
│     ├── /mei, /simples-nacional, /cronograma, /glossario, /404      │
│     └── Sitemap gerado automaticamente                              │
│                                                                     │
│  3. Vue island compilado pelo Vite (code split)                     │
│     ├── Simulator.vue         → 16KB (6KB gzip)                     │
│     ├── SimulatorResult.vue   → embutido                            │
│     └── taxCalculator.ts      → 5.5KB (2.6KB gzip) — lazy import   │
│                                                                     │
│  4. /api/simulate.ts          → SSR (prerender = false)             │
│     └── Compilado como rota de servidor Node.js                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ dist/
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Node.js Standalone Server (dist/server/entry.mjs)      │
│                                                                     │
│  dist/client/          ← arquivos estáticos (HTML, CSS, JS, SVG)   │
│  dist/server/          ← lógica SSR das rotas /api/*                │
│                                                                     │
│  GET  /                → serve HTML estático (dist/client/index.html)│
│  GET  /mei             → serve HTML estático                        │
│  POST /api/simulate    → executa SSR, calcula, retorna JSON         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ PORT 4321
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Traefik (já no seu VPS)                          │
│                                                                     │
│  traefik.http.routers.simulador.rule=Host(`simuladortributario.com.br`)
│  traefik.http.routers.simulador.tls.certresolver=letsencrypt        │
│  traefik.http.services.simulador.loadbalancer.server.port=4321      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Estrutura de arquivos

```
reforma-tributaria/
│
├── astro.config.mjs              # output: "server", adapter: node standalone
├── package.json                  # deps: astro 5, vue 3, tw v4, daisyui 5
├── .npmrc                        # legacy-peer-deps=true (compat @astrojs/vue)
├── tsconfig.json
├── Dockerfile                    # multi-stage: builder + runtime Node 22 Alpine
├── docker-compose.yml            # Traefik labels prontos para seu VPS
├── .env.example                  # REFORMA_DATA_URL (opcional)
│
├── .github/
│   └── workflows/
│       └── scheduled-rebuild.yml # Cron 07:00 UTC → webhook → rebuild diário
│
├── public/
│   ├── favicon.svg
│   ├── og-image.svg              # OG 1200×630 para redes sociais
│   └── robots.txt
│
└── src/
    ├── styles/
    │   └── global.css            # @import "tailwindcss" + @plugin "daisyui"
    │
    ├── layouts/
    │   └── BaseLayout.astro      # SEO, OG tags, schema WebApplication, nav, footer
    │
    ├── data/
    │   └── reforma-base.json     # Dados tributários v1.3 (LC 214/2025)
    │                             # Fallback local quando REFORMA_DATA_URL falha
    │
    ├── generated/                # Criado em build/dev time pelo data-fetcher
    │   ├── news.json             # Notícias RSS (gitignored)
    │   └── tax-data.json         # Dados tributários resolvidos (gitignored)
    │
    ├── integrations/
    │   └── data-fetcher.ts       # Astro integration com hooks de build + dev
    │       ├── astro:build:start → busca dados antes das páginas serem geradas
    │       └── astro:server:setup → busca dados ao iniciar dev server
    │
    ├── lib/
    │   ├── types.ts              # Interfaces TypeScript compartilhadas
    │   │   ├── SimulatorInput    # { regime, sector, monthlyRevenue }
    │   │   ├── SimulatorResult   # { impactLevel, headline, projections, ... }
    │   │   ├── YearProjection    # { year, cbsRate, ibsRate, delta, ... }
    │   │   ├── ReformaData       # Shape do JSON de dados tributários
    │   │   └── NewsData / NewsItem
    │   │
    │   ├── taxCalculator.ts      # Engine de cálculo (332 linhas)
    │   │   ├── REGIME_CBS_MULT   # Multiplicadores CBS por regime
    │   │   ├── REGIME_IBS_MULT   # Multiplicadores IBS por regime
    │   │   ├── currentConsumptionBurden()  # Carga atual (só PIS+COFINS+ISS/ICMS)
    │   │   ├── futureConsumptionBurden()   # Carga futura por ano
    │   │   ├── buildProjections()          # Array 2026–2033
    │   │   ├── buildActions()              # Checklist contextual por perfil
    │   │   ├── buildFAQs()                 # FAQs contextuais por regime
    │   │   ├── classifyImpact()            # exempt|low|medium|high|benefit
    │   │   └── calculate()                 # Função pública exportada
    │   │
    │   ├── fetchNews.ts          # Busca RSS, parse XML sem deps externas
    │   │   ├── RSS_SOURCES       # Google News + Contábeis
    │   │   ├── parseRSSItems()   # Parser XML regex (sem deps)
    │   │   ├── fetchWithTimeout()# Fetch com AbortController
    │   │   ├── dedup()           # Deduplicação por URL
    │   │   └── fetchAndSaveNews()# Entry point: busca + salva JSON
    │   │
    │   └── fetchTaxData.ts       # Busca dados tributários remotos
    │       ├── fetchRemoteData() # GET REFORMA_DATA_URL (com timeout + validação)
    │       ├── loadBaseData()    # Lê reforma-base.json (fallback local)
    │       └── fetchAndSaveTaxData() # Remote > fallback local
    │
    ├── components/
    │   ├── Simulator.vue         # Vue island — wizard 4 passos (348 linhas)
    │   │   ├── Step 1: Regime    # 6 opções com badge "Isento"
    │   │   ├── Step 2: Setor     # 11 setores com badge de redução
    │   │   ├── Step 3: Faturamento # Opções rápidas + input livre
    │   │   └── Step 4: Resultado # Renderiza <SimulatorResult />
    │   │
    │   ├── SimulatorResult.vue   # Vue — resultado visual (264 linhas)
    │   │   ├── Impact alert      # Badge colorido por nível de impacto
    │   │   ├── Tabela projeções  # 2026–2033 com delta em R$ e %
    │   │   ├── Bar chart         # Comparativo hoje vs 2027 vs 2030 vs 2033
    │   │   ├── Actions checklist # Ações contextuais por perfil
    │   │   ├── FAQ accordion     # FAQs contextuais por regime
    │   │   ├── Disclaimer        # Aviso legal de estimativa
    │   │   └── Share button      # Web Share API + fallback clipboard
    │   │
    │   └── NewsSection.astro     # Estático — grid de cards de notícias
    │
    └── pages/
        ├── index.astro           # Home: hero + simulador + cronograma + notícias + FAQ
        ├── mei.astro             # SEO: "MEI reforma tributária isento"
        ├── simples-nacional.astro# SEO: "simples nacional CBS IBS DAS"
        ├── cronograma.astro      # SEO: "cronograma reforma tributária 2026 2033"
        ├── glossario.astro       # SEO: 15 termos + schema DefinedTermSet
        ├── 404.astro
        └── api/
            └── simulate.ts       # POST /api/simulate (SSR, 205 linhas)
                ├── Validação     # Regime + setor + faturamento
                ├── Rate limit    # 60 req/min por IP (in-memory Map)
                ├── CORS          # Access-Control-Allow-Origin: *
                └── Resposta JSON # { ok, input, result, meta }
```

### 3.4 Modelo de cálculo — taxCalculator.ts

O motor de cálculo compara **apenas os tributos que CBS/IBS substituem** (PIS + COFINS + ISS/ICMS), excluindo IRPJ, CSLL e CPP que permanecem inalterados pela reforma.

**Multiplicadores por regime (calibrados para LC 214/2025):**

```typescript
// CBS: Simples paga ~22% da taxa cheia dentro do DAS
const REGIME_CBS_MULT = {
  mei:             0,     // isento
  nano:            0,     // isento
  simples:         0.22,  // embutido no DAS
  lucro_presumido: 1.0,   // taxa cheia
  lucro_real:      1.0,   // taxa cheia (créditos compensam parcialmente)
  autonomo:        0.80,
};

// IBS: Simples paga ~15% da taxa cheia (ISS hoje era baixo, IBS será menor relativamente)
const REGIME_IBS_MULT = {
  mei:             0,
  nano:            0,
  simples:         0.15,
  lucro_presumido: 1.0,
  lucro_real:      1.0,
  autonomo:        0.70,
};
```

**Carga atual por regime (consumo apenas):**

| Regime | Base | Ajuste setor | Observação |
|--------|------|--------------|------------|
| MEI | 1,0% | mínimo | isento na prática |
| Nano | 0,5% | mínimo | isento |
| Simples | 3,0% | ×0.7–1.3 suavizado | PIS+COFINS+ISS dentro do DAS |
| LP | 6,8% | ×0.5–1.3 | PIS 0,65% + COFINS 3% + ISS/ICMS ~3,15% |
| LR | 9,2% | ×0.5–1.3 | PIS NS 1,65% + COFINS NS 7,6% − créditos |
| Autônomo | 3,0% | ×0.65–1.3 | Variável por atividade |

**Reduções setoriais (LC 214/2025):**

| Setor | Fator | Redução |
|-------|-------|---------|
| Comércio | 1,0 | Sem redução |
| Serviços | 1,0 | Sem redução |
| Saúde | 0,4 | 60% de redução |
| Educação | 0,4 | 60% de redução |
| Alimentação | 0,8 | 20% de redução |
| Transporte | 0,6 | 40% de redução |
| Profissões regulamentadas | 0,7 | 30% de redução |
| Agronegócio | 0,8 | Regime especial |

**Classificação de impacto (calibrada para consumo):**

```
deltaPercent > 50%  → "high"    ⚠️
deltaPercent > 15%  → "medium"  📊
deltaPercent < -10% → "benefit" 📈
else                → "low"     ✅
```

### 3.5 Data fetcher — build-time pipeline

```
npm run dev / npm run build
        │
        ▼
astro:build:start hook (ou astro:server:setup no dev)
        │
        ├─── fetchNews()
        │    ├── GET news.google.com/rss/search?q=reforma+tributária+CBS+IBS
        │    ├── GET contabeis.com.br/noticias/rss/  (filtra keywords)
        │    ├── Parse XML sem deps (regex + CDATA handling)
        │    ├── Dedup por URL, ordena por data desc
        │    └── Salva src/generated/news.json (max 18 itens)
        │
        └─── fetchTaxData()
             ├── Se REFORMA_DATA_URL → fetch remoto (timeout 8s)
             │   └── Valida campos obrigatórios (version, transition, sectors)
             ├── Fallback → lê src/data/reforma-base.json
             └── Salva src/generated/tax-data.json

Páginas Astro importam os JSONs gerados com import dinâmico + try/catch:
  try { import("../generated/tax-data.json") }
  catch { import("../data/reforma-base.json") }  // fallback no primeiro run
```

**Atualização remota de dados (fluxo de manutenção zero):**

```
Você edita o Gist no GitHub (10 segundos)
         │
         ▼
GitHub Actions dispara rebuild às 07:00 BRT
         │
         ▼
fetchTaxData() busca REFORMA_DATA_URL (seu Gist)
         │
         ▼
Novas alíquotas/regras estão no ar sem tocar no código
```

### 3.6 API `/api/simulate`

```
POST /api/simulate
Content-Type: application/json

{
  "regime": "simples",          // mei|nano|simples|lucro_presumido|lucro_real|autonomo
  "sector": "servicos",         // comercio|servicos|saude|educacao|alimentacao|
                                 // construcao|transporte|tecnologia|
                                 // profissoes_regulamentadas|agronegocio|outro
  "monthlyRevenue": 20000       // R$ por mês
}

→ 200 OK
{
  "ok": true,
  "input": { ... },
  "result": {
    "impactLevel": "medium",
    "headline": "Impacto MODERADO esperado...",
    "summary": "...",
    "projections": [
      { "year": 2026, "cbsRate": 0.002, "ibsRate": 0.0001, "delta": -..., "deltaPercent": -..., "phase": "test" },
      ...
      { "year": 2033, "cbsRate": 0.0185, "ibsRate": 0.0264, "delta": ..., "deltaPercent": ..., "phase": "final" }
    ],
    "actions": ["🗓️ ...", "🧾 ...", ...],
    "faqs": [{ "q": "...", "a": "..." }, ...],
    "isExempt": false
  },
  "meta": {
    "dataVersion": "1.3",
    "dataLastUpdated": "2026-04-16",
    "calculatedAt": "2026-04-17T..."
  }
}

→ 422  { "error": "Invalid 'regime'. Valid values: ..." }
→ 429  { "error": "Too many requests. Limit: 60/minute." }
→ 500  { "error": "Internal calculation error." }
```

### 3.7 Deploy e infraestrutura

**Dockerfile (multi-stage):**

```dockerfile
# Stage 1: Build (Node 22 Alpine)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm install --legacy-peer-deps
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Runtime (apenas dist/ + node_modules)
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV HOST=0.0.0.0 PORT=4321 NODE_ENV=production
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
```

**docker-compose.yml — labels Traefik compatíveis com seu stack atual:**

```yaml
services:
  simulador:
    build: .
    restart: unless-stopped
    environment:
      - REFORMA_DATA_URL=   # opcional: URL do Gist com dados atualizados
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.simulador.rule=Host(`simuladortributario.com.br`)"
      - "traefik.http.routers.simulador.tls.certresolver=letsencrypt"
      - "traefik.http.services.simulador.loadbalancer.server.port=4321"
    networks:
      - traefik-public
```

**GitHub Actions — rebuild diário:**

```yaml
on:
  schedule:
    - cron: "0 7 * * *"   # 07:00 UTC = 04:00 BRT
  workflow_dispatch:

steps:
  - name: Trigger Cloudflare/Dokploy webhook
    run: curl -X POST "${{ secrets.CF_DEPLOY_HOOK }}"
```

### 3.8 SEO implementado

| Item | Implementação |
|------|--------------|
| Schema WebApplication | `<script type="application/ld+json">` no `BaseLayout.astro` |
| Schema FAQPage | Na `index.astro` com 3 perguntas |
| Schema DefinedTermSet | Na `glossario.astro` com 15 termos |
| Sitemap | `sitemap-index.xml` + `sitemap-0.xml` gerados pelo `@astrojs/sitemap` |
| robots.txt | Permite tudo, referencia sitemap |
| OG image | `og-image.svg` 1200×630 com dados do produto |
| Meta description | Customizada por página via props do layout |
| Canonical URL | `Astro.url.href` por padrão |
| URLs semânticas | `/mei`, `/simples-nacional`, `/cronograma`, `/glossario` |
| Core Web Vitals | HTML estático, Vue lazy, JS mínimo, CSS compilado |

---

## 4. Personas e Jornada

### 4.1 João — o MEI (volume principal)

**Busca:** "reforma tributária MEI 2026 muda alguma coisa"

**Jornada:**
1. Cai na home pela busca
2. Clica em "MEI" no wizard (passo 1)
3. Qualquer setor / qualquer faturamento
4. **Resultado imediato:** alert verde + "Você está ISENTO 🎉"
5. Lê o FAQ específico para MEI
6. Sai satisfeito sem precisar de contador

**Resultado do cálculo:**  
`impactLevel: "exempt"` → `isExempt: true` → exibe motivo da isenção

### 4.2 Ana — dona de salão no Simples (urgente)

**Busca:** "simples nacional vai aumentar imposto reforma tributária"

**Jornada:**
1. Cai na `/simples-nacional` ou na home
2. Seleciona Simples + Serviços + R$15.000/mês
3. Vê projeção: **impacto moderado**, +15–50% nos tributos sobre consumo até 2033
4. Vê tabela: 2026 sem cobrança, 2027 CBS entra, 2029 IBS começa
5. Recebe ações: "consulte contador antes de dez/2026", "verifique NF-e"
6. Usa o botão "Compartilhar" para mandar para o contador

**Resultado do cálculo:**  
`impactLevel: "medium"` com tabela mostrando evolução ano a ano

### 4.3 Carlos — LP + serviços (preocupado com ISS → IBS)

**Busca:** "empresa serviços lucro presumido reforma tributária impacto ISS"

**Jornada:**
1. Seleciona LP + Profissões regulamentadas + R$80.000/mês
2. Vê: impacto significativo na tabela de 2029 em diante
3. Recebe FAQ sobre Split Payment
4. Recebe ação: "mapeie créditos de CBS/IBS"

**Resultado do cálculo:**  
`impactLevel: "high"` com delta significativo em 2033

### 4.4 Marina — contadora (ampliação de autoridade)

**Jornada:**
1. Compartilha o link com clientes no WhatsApp
2. Usa a API `POST /api/simulate` para integrar ao sistema interno
3. O glossário ranqueia para termos técnicos e vira referência

---

## 5. Monetização

### 5.1 Google AdSense (camada primária)

Banners comentados no código, prontos para ativar:

```html
<!-- Em src/pages/index.astro -->
<!-- Banner 728×90 acima do simulador -->
<!-- Banner responsivo entre resultado e FAQ -->
```

**RPM estimado (nicho tributário/financeiro Brasil):** R$20–R$50 / 1.000 visitantes

| Tráfego/mês | RPM | Receita estimada |
|-------------|-----|-----------------|
| 10.000 | R$25 | R$250 |
| 50.000 | R$30 | R$1.500 |
| 200.000 | R$40 | R$8.000 |

### 5.2 Afiliados — V2 (pós-validação)

Links para plataformas de contabilidade (Contabilizei, Agilize) com CPA R$50–R$200 por lead qualificado.

### 5.3 API paga — V3

A rota `POST /api/simulate` pode ser transformada em API com plano freemium:
- **Free:** 100 chamadas/dia
- **Pro:** ilimitado — R$49/mês (para contadores integrarem ao sistema)

---

## 6. Métricas de Sucesso

### 6.1 Produto

| Métrica | Meta 3 meses | Meta 6 meses |
|---------|-------------|-------------|
| Visitantes únicos/mês | 5.000 | 30.000 |
| Taxa de conclusão do wizard | > 65% | > 70% |
| Tempo médio na página | > 3 min | > 4 min |
| Keywords no top 20 | 3–5 | 10+ |

### 6.2 Monetização

| Métrica | Meta 3 meses | Meta 6 meses |
|---------|-------------|-------------|
| Receita AdSense/mês | R$100–R$300 | R$1.500–R$5.000 |
| CTR ads | > 1,5% | > 2% |
| RPM | > R$20 | > R$30 |

### 6.3 Gatilhos para V2

- > 20.000 visitantes/mês no 4º mês
- > 500 simulações completas/dia
- AdSense aprovado e faturando > R$500/mês
- Qualquer keyword primária no top 10

---

## 7. Roadmap

### MVP — Entregue ✅

- [x] Simulador 4 passos (Vue island)
- [x] Resultado visual: timeline, projeções, bar chart, FAQ, share
- [x] 6 páginas SSG com SEO
- [x] API REST `POST /api/simulate`
- [x] Data fetcher build-time (RSS + dados remotos)
- [x] GitHub Actions cron rebuild diário
- [x] Dockerfile + docker-compose com Traefik labels
- [x] OG image, sitemap, robots.txt, schema markup

### V2 — Próximas features (pós-validação)

- [ ] **Comparador de regimes** — "se eu migrar do Simples para LP, pago mais ou menos?"
- [ ] **Calculadora de precificação** — "quanto preciso aumentar meu preço para manter a margem?"
- [ ] **Simulador de Split Payment** — impacto no fluxo de caixa dia a dia
- [ ] **Widget embeddable** — contador embute o simulador no próprio site (iframe + API)
- [ ] **Chat com IA** — "Pergunte à IA sobre seu caso" via Claude API (freemium)
- [ ] **Email de alertas** — "avise-me quando a alíquota mudar" (lista)

### V3 — Expansão

- [ ] API paga para escritórios de contabilidade
- [ ] Calculadora de créditos (Lucro Real — quanto posso aproveitar?)
- [ ] Comparador energia solar (segundo nicho do roadmap estratégico)

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Mitigação implementada |
|-------|--------------|----------------------|
| Mudança legislativa (novas alíquotas) | Alta | Dados em `reforma-base.json` separado do código. `REFORMA_DATA_URL` permite atualizar via Gist sem redeploy |
| Concorrente grande entra (Sebrae, Receita) | Média | Velocidade (HTML estático), UX superior, foco no não-contador |
| AdSense recusa por conteúdo tributário | Baixa | Disclaimer proeminente: "estimativa educacional, não é consultoria". Carbon Ads como alternativa |
| Cálculo errado gera desinformação | Baixa | Disclaimer em cada resultado. Cálculo comparativo (tributos substituídos apenas), não absoluto |
| Simples Nacional: regulamentação muda multipliers | Alta | `REGIME_CBS_MULT`/`REGIME_IBS_MULT` fáceis de ajustar. Dados remotos via Gist |

---

## 9. Comandos de referência

```bash
# Dev local
npm install
npm run dev            # http://localhost:4321
                       # data fetcher roda automaticamente na inicialização

# Build produção
npm run build          # gera dist/ com server + client

# Testar servidor local
node dist/server/entry.mjs

# Testar API
curl -X POST http://localhost:4321/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"regime":"simples","sector":"servicos","monthlyRevenue":20000}'

# Deploy Docker (VPS com Traefik)
docker compose up --build -d

# Atualizar dados tributários sem redeploy
# 1. Edite seu Gist GitHub com o JSON atualizado
# 2. O rebuild diário (GitHub Actions 07:00 UTC) pega automaticamente
# 3. Ou dispare manualmente: Actions → scheduled-rebuild → Run workflow
```

---

*PRD v2.0 — Atualizado após implementação completa do MVP.*
*Baseado em EC 132/2023, LC 214/2025 e dados públicos da Receita Federal.*
*Estimativas calculadas com REGIME_CBS_MULT / REGIME_IBS_MULT calibrados.*
*Não substitui consultoria tributária profissional.*