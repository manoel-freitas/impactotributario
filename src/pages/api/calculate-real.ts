import type { APIRoute } from "astro";
import type { SimulatorInput, SimulatorResult, ReformaData } from "../../lib/types.ts";
import { calculate } from "../../lib/taxCalculator.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function loadTaxData(): ReformaData | null {
  const candidates = [
    join(process.cwd(), "src", "generated", "tax-data.json"),
    join(process.cwd(), "src", "data", "reforma-base.json"),
  ];

  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as ReformaData;
    } catch {
      // try next
    }
  }
  return null;
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

    const data = loadTaxData();
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