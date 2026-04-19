#!/usr/bin/env npx tsx
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const API_BASE = "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api";

const UF_CODES = [
  { code: "SP", ibge: 35 },
  { code: "RJ", ibge: 33 },
  { code: "MG", ibge: 31 },
  { code: "RS", ibge: 43 },
  { code: "PR", ibge: 41 },
  { code: "BA", ibge: 29 },
  { code: "PE", ibge: 26 },
  { code: "CE", ibge: 23 },
  { code: "PA", ibge: 15 },
  { code: "SC", ibge: 42 },
];

function execJson<T>(endpoint: string): T | null {
  try {
    const url = `${API_BASE}${endpoint}`;
    const cmd = `curl -s -w "\\n%{http_code}" "${url}"`;
    const out = execSync(cmd, { timeout: 15000, encoding: "utf-8" });

    if (!out || out.trim() === "" || out.includes("<html") || out.includes("Request Rejected")) {
      const lines = out.split("\n").filter(Boolean);
      const httpStatus = lines[lines.length - 1];
      console.log(`  ↳ ${endpoint} → HTTP ${httpStatus}`);
      return null;
    }

    const jsonPart = out.replace(/\n\d{3}$/, "").trim();
    if (!jsonPart) return null;

    return JSON.parse(jsonPart) as T;
  } catch (err) {
    console.log(`  ✗ Failed to fetch ${endpoint}:`, err);
    return null;
  }
}

async function main() {
  console.log("📊 Fetching CBS/IBS rates from pilot API...\n");

  const cbsData = execJson<{ aliquotaReferencia: number }>(
    "/calculadora/dados-abertos/aliquota-uniao?data=2026-01-01"
  );

  if (!cbsData) {
    console.log("❌ CBS API is blocked. Options:");
    console.log("  1. Wait a few hours for rate limit to reset");
    console.log("  2. Run this script from a different network");
    console.log("  3. Set REFORMA_DATA_URL env var to a hosted JSON");
    process.exit(1);
  }

  const cbsRate = cbsData.aliquotaReferencia / 100;
  const ibsRates = UF_CODES.map((uf) => {
    const data = execJson<{ aliquotaReferencia: number }>(
      `/calculadora/dados-abertos/aliquota-uf?data=2026-01-01&codigoUf=${uf.ibge}`
    );
    return data?.aliquotaReferencia ?? 0.1;
  });
  const ibsRate = ibsRates.reduce((sum, r) => sum + r, 0) / ibsRates.length / 100;

  const data = {
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    source: "CBS/IBS Pilot API (dados-abertos)",
    transition: {
      years: {
        "2026": { cbs: cbsRate * 0.25, ibs: ibsRate * 0.25, phase: "test", notes: "Fase teste: 25%" },
        "2027": { cbs: cbsRate * 0.5, ibs: ibsRate * 0.5, phase: "transition", notes: "Transição: 50%" },
        "2028": { cbs: cbsRate * 0.75, ibs: ibsRate * 0.75, phase: "transition", notes: "Transição: 75%" },
        "2029": { cbs: cbsRate * 0.9, ibs: ibsRate * 0.9, phase: "transition", notes: "Transição: 90%" },
        "2030": { cbs: cbsRate * 0.95, ibs: ibsRate * 0.95, phase: "transition", notes: "Transição: 95%" },
        "2031": { cbs: cbsRate * 0.975, ibs: ibsRate * 0.975, phase: "transition", notes: "Transição: 97.5%" },
        "2032": { cbs: cbsRate * 0.99, ibs: ibsRate * 0.99, phase: "transition", notes: "Transição: 99%" },
        "2033": { cbs: cbsRate, ibs: ibsRate, phase: "final", notes: "Alíquota cheia" },
      },
    },
    sectorReductions: {
      comercio: { label: "Comércio varejista e atacadista", reductionFactor: 1, notes: "Alíquota cheia" },
      servicos: { label: "Serviços em geral", reductionFactor: 0.7, notes: "Serviços com redução" },
      saude: { label: "Saúde", reductionFactor: 0.4, notes: "Essential goods reduction" },
      educacao: { label: "Educação", reductionFactor: 0.4, notes: "Essential services reduction" },
      alimentacao: { label: "Alimentação", reductionFactor: 0.4, notes: "Essential goods reduction" },
      construcao: { label: "Construção civil", reductionFactor: 0.7, notes: "Reduced rate" },
      transporte: { label: "Transporte", reductionFactor: 0.7, notes: "Reduced rate" },
      tecnologia: { label: "Tecnologia", reductionFactor: 1, notes: "Standard rate" },
      profissoes_regulamentadas: { label: "Profissões regulamentadas", reductionFactor: 0.7, notes: "Professional services" },
      agronegocio: { label: "Agronegócio", reductionFactor: 0.4, notes: "Essential goods reduction" },
      outro: { label: "Outros setores", reductionFactor: 1, notes: "Standard rate" },
    },
    regimeRules: {
      mei: { label: "MEI", isExempt: true, exemptReason: "Parcelamento simplificado", currentEffectiveRate: 0, notes: "Isento de CBS/IBS" },
      nano: { label: "Nanoempresa (Simples)", isExempt: true, currentEffectiveRate: 0, notes: "Isento no período" },
      simples: { label: "Simples Nacional", isExempt: false, currentEffectiveRate: 0.035, notes: "CBS/IBS no DAS" },
      lucro_presumido: { label: "Lucro Presumido", isExempt: false, currentEffectiveRate: 0.112, notes: "PIS + COFINS + IRPJ" },
      lucro_real: { label: "Lucro Real", isExempt: false, currentEffectiveRate: 0.112, notes: "PIS + COFINS + IRPJ + CSLL" },
      autonomo: { label: "Autônomo", isExempt: false, currentEffectiveRate: 0.05, notes: "INSS + ISS" },
    },
    currentRates: {
      pis: 0.0065,
      cofins: 0.03,
      icms_avg: 0.12,
      iss_avg: 0.03,
    },
  };

  const outDir = join(process.cwd(), "src", "generated");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "tax-data.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`\n✅ CBS: ${(cbsRate * 100).toFixed(2)}%, IBS avg: ${(ibsRate * 100).toFixed(2)}%`);
  console.log(`✅ Saved → ${outPath}`);
}

main();