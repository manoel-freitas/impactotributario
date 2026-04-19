import { execSync } from "node:child_process";
import type { ReformaData, TransitionSchedule, SectorRule, RegimeRule, CurrentRates } from "./types.ts";

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
    const cmd = `curl -s -w "\\n%{http_code}" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
    const out = execSync(cmd, { timeout: 10000, encoding: "utf-8" });

    if (!out || out.trim() === "" || out.includes("<html") || out.includes("Request Rejected")) {
      const lines = out.split("\n").filter(Boolean);
      const httpStatus = lines[lines.length - 1];
      console.warn(`  ↳ ${endpoint} → WAF block (HTTP ${httpStatus})`);
      return null;
    }

    const jsonPart = out.replace(/\n\d{3}$/, "").trim();
    if (!jsonPart) return null;

    return JSON.parse(jsonPart) as T;
  } catch (err) {
    console.warn(`  ✗ Failed to exec ${endpoint}:`, err);
    return null;
  }
}

interface ApiAliquotaUniao {
  aliquotaReferencia: number;
}

interface ApiAliquotaUf {
  aliquotaReferencia: number;
}

interface ApiClassificacao {
  codigo: string;
  descricao: string;
  percentualReducaoCbs: number;
  percentualReducaoIbsMun: number;
  percentualReducaoIbsUf: number;
}

function fetchCbsRate(date: string): number {
  const data = execJson<ApiAliquotaUniao>(`/calculadora/dados-abertos/aliquota-uniao?data=${date}`);
  return data?.aliquotaReferencia ?? 0.009;
}

function fetchIbsRate(date: string, codigoUf: number): number {
  const data = execJson<ApiAliquotaUf>(
    `/calculadora/dados-abertos/aliquota-uf?data=${date}&codigoUf=${codigoUf}`
  );
  return data?.aliquotaReferencia ?? 0.001;
}

function fetchClassificacoes(): Map<string, ApiClassificacao> {
  const data = execJson<ApiClassificacao[]>(
    "/calculadora/dados-abertos/classificacoes-tributarias/cbs-ibs?data=2026-01-01"
  );
  if (!data) return new Map();
  return new Map(data.map((c: ApiClassificacao) => [c.codigo, c]));
}

export async function fetchCbsOfficialRates(
  refDate: string = "2026-01-01"
): Promise<ReformaData | null> {
  console.log("📊 Fetching official CBS/IBS rates from pilot API...");

  try {
    const classificacoes = fetchClassificacoes();
    const cbsRate = fetchCbsRate(refDate);

    if (!classificacoes || classificacoes.size === 0) {
      console.warn("  ↳ Classification fetch failed — using fallback");
      return null;
    }

    const ibsRates = UF_CODES.map((uf) => fetchIbsRate(refDate, uf.ibge));
    const ibsRate = ibsRates.reduce((sum, r) => sum + r, 0) / ibsRates.length;

    const cbsRateDec = cbsRate / 100;
    const ibsRateDec = ibsRate / 100;

    const reductionMap = new Map<string, number>();
    for (const c of classificacoes.values()) {
      reductionMap.set(c.codigo, 1 - (c.percentualReducaoCbs / 100));
    }

    const sectorReductions: Record<string, SectorRule> = {
      comercio: {
        label: "Comércio varejista e atacadista",
        reductionFactor: reductionMap.get("00") ?? 1,
        notes: "Alíquota cheia",
      },
      servicos: {
        label: "Serviços em geral",
        reductionFactor: reductionMap.get("04") ?? 0.7,
        notes: "Serviços com redução",
      },
      saude: {
        label: "Saúde",
        reductionFactor: reductionMap.get("03") ?? 0.4,
        notes: "Essential goods reduction",
      },
      educacao: {
        label: "Educação",
        reductionFactor: reductionMap.get("03") ?? 0.4,
        notes: "Essential services reduction",
      },
      alimentacao: {
        label: "Alimentação",
        reductionFactor: reductionMap.get("03") ?? 0.4,
        notes: "Essential goods reduction",
      },
      construcao: {
        label: "Construção civil",
        reductionFactor: reductionMap.get("04") ?? 0.7,
        notes: "Reduced rate",
      },
      transporte: {
        label: "Transporte",
        reductionFactor: reductionMap.get("04") ?? 0.7,
        notes: "Reduced rate",
      },
      tecnologia: {
        label: "Tecnologia",
        reductionFactor: reductionMap.get("04") ?? 1,
        notes: "Standard rate",
      },
      profissoes_regulamentadas: {
        label: "Profissões regulamentadas",
        reductionFactor: reductionMap.get("04") ?? 0.7,
        notes: "Professional services",
      },
      agronegocio: {
        label: "Agronegócio",
        reductionFactor: reductionMap.get("03") ?? 0.4,
        notes: "Essential goods reduction",
      },
      outro: {
        label: "Outros setores",
        reductionFactor: reductionMap.get("04") ?? 1,
        notes: "Standard rate",
      },
    };

    const transition: TransitionSchedule = {
      years: {
        "2026": {
          cbs: cbsRateDec * 0.25,
          ibs: ibsRateDec * 0.25,
          phase: "test",
          notes: "Fase teste: 25%",
        },
        "2027": {
          cbs: cbsRateDec * 0.5,
          ibs: ibsRateDec * 0.5,
          phase: "transition",
          notes: "Transição: 50%",
        },
        "2028": {
          cbs: cbsRateDec * 0.75,
          ibs: ibsRateDec * 0.75,
          phase: "transition",
          notes: "Transição: 75%",
        },
        "2029": {
          cbs: cbsRateDec * 0.9,
          ibs: ibsRateDec * 0.9,
          phase: "transition",
          notes: "Transição: 90%",
        },
        "2030": {
          cbs: cbsRateDec * 0.95,
          ibs: ibsRateDec * 0.95,
          phase: "transition",
          notes: "Transição: 95%",
        },
        "2031": {
          cbs: cbsRateDec * 0.975,
          ibs: ibsRateDec * 0.975,
          phase: "transition",
          notes: "Transição: 97.5%",
        },
        "2032": {
          cbs: cbsRateDec * 0.99,
          ibs: ibsRateDec * 0.99,
          phase: "transition",
          notes: "Transição: 99%",
        },
        "2033": {
          cbs: cbsRateDec,
          ibs: ibsRateDec,
          phase: "final",
          notes: "Alíquota cheia",
        },
      },
    };

    const currentRates: CurrentRates = {
      pis: 0.0065,
      cofins: 0.03,
      icms_avg: 0.12,
      iss_avg: 0.03,
    };

    console.log(
      `  ✓ CBS: ${(cbsRateDec * 100).toFixed(2)}%, IBS avg: ${(ibsRateDec * 100).toFixed(2)}%`
    );

    return {
      version: "2.0.0",
      lastUpdated: new Date().toISOString(),
      source: "CBS/IBS Pilot API (dados-abertos)",
      transition,
      sectorReductions:
        sectorReductions as Record<
          | "comercio"
          | "servicos"
          | "saude"
          | "educacao"
          | "alimentacao"
          | "construcao"
          | "transporte"
          | "tecnologia"
          | "profissoes_regulamentadas"
          | "agronegocio"
          | "outro",
          SectorRule
        >,
      regimeRules: {
        mei: {
          label: "MEI",
          isExempt: true,
          exemptReason: "Parcelamento simplificado",
          currentEffectiveRate: 0,
          notes: "Isento de CBS/IBS",
        },
        nano: {
          label: "Nanoempresa (Simples)",
          isExempt: true,
          currentEffectiveRate: 0,
          notes: "Isento no período",
        },
        simples: {
          label: "Simples Nacional",
          isExempt: false,
          currentEffectiveRate: 0.035,
          notes: "CBS/IBS no DAS",
        },
        lucro_presumido: {
          label: "Lucro Presumido",
          isExempt: false,
          currentEffectiveRate: 0.112,
          notes: "PIS + COFINS + IRPJ",
        },
        lucro_real: {
          label: "Lucro Real",
          isExempt: false,
          currentEffectiveRate: 0.112,
          notes: "PIS + COFINS + IRPJ + CSLL",
        },
        autonomo: {
          label: "Autônomo",
          isExempt: false,
          currentEffectiveRate: 0.05,
          notes: "INSS + ISS",
        },
      } as Record<
        | "mei"
        | "nano"
        | "simples"
        | "lucro_presumido"
        | "lucro_real"
        | "autonomo",
        RegimeRule
      >,
      currentRates,
    };
  } catch (err) {
    console.warn("  ✗ Failed to fetch official rates:", err);
    return null;
  }
}