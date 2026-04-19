import type { APIRoute } from "astro";
import type { SimulatorInput, SimulatorResult, ReformaData } from "../../lib/types.ts";
import { calculate } from "../../lib/taxCalculator.ts";
import reformaBase from "../../data/reforma-base.json";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

async function loadTaxData(): Promise<ReformaData | null> {
  if (REFORMA_DATA_URL) {
    const remote = await fetchRemoteTaxData(REFORMA_DATA_URL);
    if (remote) return remote;
  }
  return reformaBase as ReformaData;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = (await request.json()) as SimulatorInput;

    if (!input.regime || !input.sector || !input.monthlyRevenue) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: regime, sector, monthlyRevenue" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await loadTaxData();
    if (!data) {
      return new Response(
        JSON.stringify({ ok: false, error: "Dados tributários indisponíveis" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = calculate(input, data);
    return new Response(
      JSON.stringify({
        ok: true,
        input,
        result,
        cbsOfficial: null,
        meta: { source: "LOCAL_CALC", dataVersion: data.version },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("calculate-real error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      description: "CBS/IBS calculation endpoint",
      method: "POST",
      body: {
        regime: "mei|nano|simples|lucro_presumido|lucro_real|autonomo",
        sector: "comercio|servicos|saude|educacao|alimentacao|construcao|transporte|tecnologia|profissoes_regulamentadas|agronegocio|outro",
        monthlyRevenue: 12345.67,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};