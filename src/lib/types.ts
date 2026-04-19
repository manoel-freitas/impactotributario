// ─── Tax Regime ────────────────────────────────────────────────────────────────
export type TaxRegime =
  | "mei"
  | "nano"
  | "simples"
  | "lucro_presumido"
  | "lucro_real"
  | "autonomo";

// ─── Sector ────────────────────────────────────────────────────────────────────
export type Sector =
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
  | "outro";

// ─── Simulator Input ───────────────────────────────────────────────────────────
export interface SimulatorInput {
  regime: TaxRegime;
  sector: Sector;
  monthlyRevenue: number; // R$
  uf?: string;
  municipioIbge?: string;
}

// ─── Year Projection ──────────────────────────────────────────────────────────
export interface YearProjection {
  year: number;
  cbsRate: number;
  ibsRate: number;
  totalNewRate: number;
  estimatedTaxBefore: number; // R$ based on current rules
  estimatedTaxAfter: number;  // R$ based on new rules for that year
  delta: number;               // difference in R$
  deltaPercent: number;        // % change
  phase: "test" | "transition" | "final";
  notes: string[];
}

// ─── Simulator Result ─────────────────────────────────────────────────────────
export type ImpactLevel = "exempt" | "low" | "medium" | "high" | "benefit";

export interface SimulatorResult {
  impactLevel: ImpactLevel;
  headline: string;
  summary: string;
  projections: YearProjection[];
  actions: string[];
  faqs: { q: string; a: string }[];
  isExempt: boolean;
  exemptReason?: string;
  legalRef?: LegalRef;
}

// ─── Tax Reform Data (from JSON) ──────────────────────────────────────────────
export interface ReformaData {
  version: string;
  lastUpdated: string;
  source: string;
  legislationLinks?: LegalRef[];
  transition: TransitionSchedule;
  sectorReductions: Record<Sector, SectorRule>;
  regimeRules: Record<TaxRegime, RegimeRule>;
  currentRates: CurrentRates;
}

export interface TransitionSchedule {
  years: Record<
    string,
    {
      cbs: number;
      ibs: number;
      phase: "test" | "transition" | "final";
      notes: string;
      legalRef?: LegalRef;
    }
  >;
}

export interface LegalRef {
  label: string;
  url: string;
}

export interface SectorRule {
  label: string;
  reductionFactor: number; // 1.0 = no reduction, 0.4 = 60% reduction
  notes: string;
  isExempt?: boolean;
  legalRef?: LegalRef;
}

export interface RegimeRule {
  label: string;
  isExempt: boolean;
  exemptReason?: string;
  currentEffectiveRate: number; // Current average effective rate
  notes: string;
  legalRef?: LegalRef;
}

export interface CurrentRates {
  pis: number;
  cofins: number;
  icms_avg: number;
  iss_avg: number;
}

// ─── News ──────────────────────────────────────────────────────────────────────
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  isoDate: string;
  imageUrl?: string;
}

export interface NewsData {
  fetchedAt: string;
  items: NewsItem[];
}
