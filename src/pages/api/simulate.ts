// Server-side API route — works on Cloudflare Workers.
// Returns a full SimulatorResult JSON from a SimulatorInput payload.
//
// Usage:
//   POST /api/simulate
//   Content-Type: application/json
//   { "regime": "simples", "sector": "servicos", "monthlyRevenue": 15000 }
//
// curl example:
//   curl -X POST http://localhost:4321/api/simulate \
//     -H "Content-Type: application/json" \
//     -d '{"regime":"mei","sector":"comercio","monthlyRevenue":5000}'

export const prerender = false;

import type { APIRoute } from "astro";
import type { SimulatorInput, ReformaData } from "../../lib/types.ts";
import { calculate } from "../../lib/taxCalculator.ts";
import reformaBase from "../../data/reforma-base.json";

// ─── Load tax data for Workers runtime ─────────────────────────────
// Priority: 1) remote URL (REFORMA_DATA_URL env var), 2) bundled fallback
function getEnvVar(key: string): string | undefined {
  const g = globalThis as Record<string, unknown>;
  const env = import.meta.env as Record<string, unknown>;
  return (g[key] as string) ?? (env[key] as string);
}
const REFORMA_DATA_URL = getEnvVar("REFORMA_DATA_URL") ?? "";

async function fetchRemoteTaxData(url: string, timeout = 5000): Promise<ReformaData | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return (await res.json()) as ReformaData;
  } catch {
    return null;
  }
}

async function loadTaxData(): Promise<ReformaData> {
  // Try remote URL first (Cloudflare Secret / env var)
  if (REFORMA_DATA_URL) {
    const remote = await fetchRemoteTaxData(REFORMA_DATA_URL);
    if (remote) return remote;
  }
  // Fallback to bundled JSON
  return reformaBase as ReformaData;
}

// Cached tax data (refreshed hourly)
let _taxDataCache: { data: ReformaData; expiry: number } | null = null;
async function getTaxData(): Promise<ReformaData> {
  const now = Date.now();
  // Return cached if still valid (1 hour TTL)
  if (_taxDataCache && now < _taxDataCache.expiry) {
    return _taxDataCache.data;
  }
  const data = await loadTaxData();
  _taxDataCache = { data, expiry: now + 60 * 60 * 1000 };
  return data;
}

// ─── Validators ────────────────────────────────────────────────────────────────
const VALID_REGIMES = new Set([
  "mei", "nano", "simples", "lucro_presumido", "lucro_real", "autonomo",
]);
const VALID_SECTORS = new Set([
  "comercio", "servicos", "saude", "educacao", "alimentacao",
  "construcao", "transporte", "tecnologia", "profissoes_regulamentadas",
  "agronegocio", "outro",
]);

function validate(body: unknown): SimulatorInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;

  if (!b.regime || !VALID_REGIMES.has(b.regime as string)) {
    return { error: `Invalid 'regime'. Valid values: ${[...VALID_REGIMES].join(", ")}.` };
  }

  const sector = (b.sector as string) ?? "outro";
  if (!VALID_SECTORS.has(sector)) {
    return { error: `Invalid 'sector'. Valid values: ${[...VALID_SECTORS].join(", ")}.` };
  }

  const revenue = Number(b.monthlyRevenue);
  const MAX_MONTHLY_REVENUE = 100_000_000;
  if (isNaN(revenue) || revenue < 0) {
    return { error: "'monthlyRevenue' must be a non-negative number." };
  }
  if (revenue > MAX_MONTHLY_REVENUE) {
    return { error: `'monthlyRevenue' exceeds maximum allowed value of ${MAX_MONTHLY_REVENUE}.` };
  }

  return {
    regime: b.regime as SimulatorInput["regime"],
    sector: sector as SimulatorInput["sector"],
    monthlyRevenue: revenue,
  };
}

// ─── Rate limiting (in-memory, simple) ────────────────────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;        // requests
const RATE_WINDOW = 60_000;   // 1 minute

// Cleanup expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(ip);
  }
}, 5 * 60_000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// ─── CORS helper ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ─── Handler ──────────────────────────────────────────────────────────────────
export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress ?? "unknown";

  // Rate limit
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Limit: 60/minute." }),
      { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Validate
  const input = validate(body);
  if ("error" in input) {
    return new Response(
      JSON.stringify({ error: input.error }),
      { status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Load tax data (separate from calculation to give distinct error codes)
  let taxData: ReformaData;
  try {
    taxData = await getTaxData();
  } catch (err) {
    console.error("[/api/simulate] Tax data unavailable:", err);
    return new Response(
      JSON.stringify({ error: "Dados tributários indisponíveis. Tente novamente em instantes." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Calculate
  try {
    const result = calculate(input, taxData);

    return new Response(
      JSON.stringify({
        ok: true,
        input,
        result,
        meta: {
          dataVersion: taxData.version,
          dataLastUpdated: taxData.lastUpdated,
          calculatedAt: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[/api/simulate] Calculation error:", err);
    return new Response(
      JSON.stringify({ error: "Internal calculation error." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
};

// GET → documentation
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      endpoint: "POST /api/simulate",
      description: "Calcula o impacto da Reforma Tributária (CBS/IBS) para um perfil de empresa.",
      contentType: "application/json",
      body: {
        regime: `string — um de: ${[...VALID_REGIMES].join(", ")}`,
        sector: `string — um de: ${[...VALID_SECTORS].join(", ")}`,
        monthlyRevenue: "number — faturamento mensal em R$",
      },
      example: {
        regime: "simples",
        sector: "servicos",
        monthlyRevenue: 15000,
      },
      rateLimit: `${RATE_LIMIT} requests/minuto por IP`,
    }, null, 2),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
