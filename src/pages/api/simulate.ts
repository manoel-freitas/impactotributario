// Server-side API route — only active when output=hybrid (Node.js/VPS deploy).
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

export const prerender = false; // Never pre-render — always server-side

import type { APIRoute } from "astro";
import type { SimulatorInput, ReformaData } from "../../lib/types.ts";
import { calculate } from "../../lib/taxCalculator.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// ─── Load tax data once at module level (cached across requests) ───────────────
function loadTaxData(): ReformaData {
  // Try generated file first (written by data-fetcher at startup)
  const candidates = [
    join(process.cwd(), "src", "generated", "tax-data.json"),
    join(process.cwd(), "src", "data",      "reforma-base.json"),
  ];

  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as ReformaData;
    } catch {
      // try next
    }
  }

  throw new Error("No tax data found — run npm run dev or npm run build first.");
}

let _taxData: ReformaData | null = null;
function getTaxData(): ReformaData {
  if (!_taxData) _taxData = loadTaxData();
  return _taxData;
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
    taxData = getTaxData();
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
