import type {
  SimulatorInput,
  SimulatorResult,
  YearProjection,
  ImpactLevel,
  ReformaData,
  LegalRef,
} from "./types.ts";

// ─── Regime-specific CBS/IBS multipliers ──────────────────────────────────────
// Reflects how each regime pays CBS/IBS relative to the reference rate.
// Simples: CBS/IBS embedded in DAS at much lower rates than the full reference.
// Source: LC 214/2025, IBPT estimates, analysis by OSP/Conta Azul.
const REGIME_CBS_MULT: Record<string, number> = {
  mei:             0,     // isento
  nano:            0,     // isento
  simples:         0.22,  // embutido no DAS, aprox. 22% da taxa cheia
  lucro_presumido: 1.0,
  lucro_real:      1.0,
  autonomo:        0.80,
};

const REGIME_IBS_MULT: Record<string, number> = {
  mei:             0,
  nano:            0,
  simples:         0.15,  // embutido no DAS, aprox. 15% da taxa cheia
  lucro_presumido: 1.0,
  lucro_real:      1.0,
  autonomo:        0.70,
};

// ─── Current consumption-tax burden (PIS+COFINS+ISS/ICMS only) ───────────────
// We compare only the taxes that CBS/IBS REPLACE — not income taxes (IRPJ/CSLL/CPP)
// which are unchanged by the reform.
function currentConsumptionBurden(
  input: SimulatorInput,
  data: ReformaData
): number {
  const { regime, sector } = input;

  const regimeBase: Record<string, number> = {
    mei:             0.010,
    nano:            0.005,
    simples:         0.030, // consumo dentro do DAS (PIS+COFINS+ISS equiv.)
    lucro_presumido: 0.068, // PIS 0.65% + COFINS 3% + ISS/ICMS medio ~3.15%
    lucro_real:      0.092, // PIS NS 1.65% + COFINS NS 7.6% - creditos medios
    autonomo:        0.030,
  };

  // Sector: comércio paga ICMS alto; serviços pagam ISS baixo
  const sectorAdj: Record<string, number> = {
    comercio:                  1.30,
    servicos:                  0.75,
    saude:                     0.60,
    educacao:                  0.50,
    alimentacao:               0.95,
    construcao:                1.10,
    transporte:                0.80,
    tecnologia:                0.75,
    profissoes_regulamentadas: 0.65,
    agronegocio:               0.55,
    outro:                     1.00,
  };

  const base = regimeBase[regime] ?? 0.035;
  // Para Simples, setor tem impacto suavizado (DAS já unifica tudo)
  const adj = regime === "simples"
    ? 1.0 + ((sectorAdj[sector] ?? 1.0) - 1.0) * 0.3
    : (sectorAdj[sector] ?? 1.0);

  return base * adj;
}

// ─── Future CBS+IBS burden for a given year ───────────────────────────────────
function futureConsumptionBurden(
  input: SimulatorInput,
  year: number,
  data: ReformaData
): number {
  const schedule = data.transition.years[String(year)];
  if (!schedule) return 0;

  const sectorFactor = data.sectorReductions[input.sector]?.reductionFactor ?? 1.0;
  const cbsMult      = REGIME_CBS_MULT[input.regime] ?? 1.0;
  const ibsMult      = REGIME_IBS_MULT[input.regime] ?? 1.0;

  return schedule.cbs * sectorFactor * cbsMult
       + schedule.ibs * sectorFactor * ibsMult;
}

// ─── Build per-year projections ───────────────────────────────────────────────
function buildProjections(
  input: SimulatorInput,
  data: ReformaData
): YearProjection[] {
  const years         = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];
  const annualRevenue = input.monthlyRevenue * 12;
  const currentRate   = currentConsumptionBurden(input, data);

  return years.map((year) => {
    const schedule     = data.transition.years[String(year)];
    const sectorRule   = data.sectorReductions[input.sector];

    const totalNewRate = futureConsumptionBurden(input, year, data);
    const sectorFactor = sectorRule?.reductionFactor ?? 1.0;
    const cbsMult      = REGIME_CBS_MULT[input.regime] ?? 1.0;
    const ibsMult      = REGIME_IBS_MULT[input.regime] ?? 1.0;
    // Guard: schedule may be undefined if year data is missing from tax JSON
    const cbsRate      = (schedule?.cbs ?? 0) * sectorFactor * cbsMult;
    const ibsRate      = (schedule?.ibs ?? 0) * sectorFactor * ibsMult;

    const estimatedTaxBefore = annualRevenue * currentRate;
    const estimatedTaxAfter  = annualRevenue * totalNewRate;
    const delta              = estimatedTaxAfter - estimatedTaxBefore;
    const deltaPercent       = estimatedTaxBefore > 0
      ? (delta / estimatedTaxBefore) * 100
      : 0;

    const notes: string[] = [schedule?.notes ?? ""].filter(Boolean);
    if ((sectorRule?.reductionFactor ?? 1) < 1.0) {
      const pct = Math.round((1 - sectorRule!.reductionFactor) * 100);
      notes.push(`Seu setor tem redução de ${pct}% na alíquota padrão.`);
    }
    if (input.regime === "simples" && year === 2027) {
      notes.push("Simples Nacional: CBS passa a integrar o DAS em 2027 com alíquota reduzida.");
    }

    return {
      year,
      cbsRate,
      ibsRate,
      totalNewRate,
      estimatedTaxBefore,
      estimatedTaxAfter,
      delta,
      deltaPercent,
      phase: schedule?.phase ?? "transition",
      notes,
    };
  });
}

// ─── Actions by profile ───────────────────────────────────────────────────────
function buildActions(
  input: SimulatorInput,
  impactLevel: ImpactLevel,
  data: ReformaData
): string[] {
  const { regime, sector } = input;
  const exempt = data.regimeRules?.[regime]?.isExempt ?? false;

  if (exempt) {
    return [
      "Você está isento — nenhuma ação financeira urgente necessária.",
      "Confirme com seu contador que o faturamento se mantém dentro do limite anual.",
      "A partir de 2027, notas fiscais precisarão ter os campos de IBS/CBS preenchidos (sem cobrança).",
      "Acompanhe atualizações: regras do MEI na reforma podem ser ajustadas até 2027.",
    ];
  }

  const base: string[] = [
    "2026 é ano de adaptação sem cobrança — o impacto real começa em 2027.",
    "Verifique se seu software fiscal já suporta os campos de IBS/CBS na NF-e.",
    "Agende revisão tributária com seu contador antes de dezembro/2026.",
  ];

  if (regime === "simples") {
    base.push(
      "Simule com seu contador se vale manter o Simples ou migrar para Lucro Presumido (especialmente se vende muito para PJ de Lucro Real).",
      "Fornecedores fora do Simples geram créditos maiores para seus clientes — analise o impacto na competitividade."
    );
  }

  if (regime === "lucro_presumido" || regime === "lucro_real") {
    base.push(
      "Revise o enquadramento NCM/NBS de produtos e serviços nas notas fiscais.",
      "Mapeie os créditos de CBS/IBS que poderá aproveitar na cadeia produtiva.",
      "Planeje o Split Payment: a partir de 2027 o CBS é retido automaticamente no Pix/cartão, impactando o fluxo de caixa."
    );
  }

  if (impactLevel === "high") {
    base.unshift("ATENÇÃO: seu perfil indica aumento relevante — priorize o planejamento tributário ainda em 2026.");
  }
  if (impactLevel === "benefit") {
    base.push("Analise com seu contador como maximizar os créditos do IVA na sua cadeia produtiva.");
  }
  if (sector === "saude" || sector === "educacao") {
    base.push("Confirme que suas atividades se enquadram na redução de 60% prevista na LC 214/2025.");
  }
  if (["servicos","tecnologia","profissoes_regulamentadas"].includes(sector)) {
    base.push("Serviços podem ter aumento relevante: ISS atual (2–5%) será substituído por IBS (maior). Simule cenários.");
  }

  return base;
}

// ─── FAQs by profile ─────────────────────────────────────────────────────────
function buildFAQs(
  input: SimulatorInput,
  data: ReformaData
): { q: string; a: string }[] {
  const { regime } = input;
  const exempt = data.regimeRules?.[regime]?.isExempt ?? false;

  const base = [
    {
      q: "O que são CBS e IBS?",
      a: "CBS (Contribuição sobre Bens e Serviços) é federal e substitui PIS e COFINS. IBS (Imposto sobre Bens e Serviços) é estadual/municipal e substitui ICMS e ISS. Juntos formam o IVA Dual brasileiro, seguindo o modelo usado em mais de 170 países.",
    },
    {
      q: "Em 2026 vou pagar CBS e IBS?",
      a: "Não. Em 2026, CBS (0,9%) e IBS (0,1%) aparecem na nota fiscal apenas para fins informativos — não há cobrança efetiva. O governo confirmou que 2026 é exclusivamente um ano de adaptação dos sistemas.",
    },
    {
      q: "Até quando vai a transição?",
      a: "A transição vai de 2026 a 2033. PIS, COFINS, ICMS, ISS e IPI são eliminados progressivamente. Em 2027 a CBS entra em vigor. O IBS começa em 2029 e chega à alíquota plena em 2033.",
    },
  ];

  if (exempt) {
    base.push({
      q: `O ${regime === "mei" ? "MEI" : "nanoempreendedor"} vai ser afetado?`,
      a: regime === "mei"
        ? "O MEI com faturamento até R$81.000/ano está isento de CBS e IBS pela LC 214/2025. A partir de 2027, as notas fiscais do MEI precisarão ter os campos preenchidos, mas sem cobrança."
        : "O nanoempreendedor (nova categoria, até R$40.500/ano) tem isenção total de CBS e IBS pela EC 132/2023. É o regime mais protegido da reforma.",
    });
    return base;
  }

  if (regime === "simples") {
    base.push(
      {
        q: "O Simples Nacional vai acabar?",
        a: "Não. O Simples Nacional é mantido pela LC 214/2025. CBS e IBS serão embutidos no DAS com alíquotas menores que as do regime geral. A transição para o Simples começa em 2027.",
      },
      {
        q: "O DAS vai ficar mais caro?",
        a: "O aumento deve ser moderado para a maioria. As alíquotas de CBS/IBS dentro do DAS serão proporcionais às alíquotas atuais do Simples. O impacto indireto pode ser maior: empresas de Lucro Real preferem comprar de fornecedores que geram crédito integral.",
      }
    );
  }

  if (regime === "lucro_presumido" || regime === "lucro_real") {
    base.push(
      {
        q: "O que é Split Payment e como me afeta?",
        a: "A partir de 2027, o CBS é retido automaticamente no Pix ou cartão antes de o valor chegar à sua conta. Elimina o float tributário. Planeje o fluxo de caixa com antecedência.",
      },
      {
        q: "Vou poder aproveitar créditos de CBS/IBS?",
        a: "Sim. O IVA Dual é não cumulativo — o imposto pago nas etapas anteriores da cadeia é creditado. Empresas com muitos insumos (Lucro Real) tendem a se beneficiar mais.",
      }
    );
  }

  return base;
}

// ─── Impact classification ────────────────────────────────────────────────────
function classifyImpact(
  deltaPercent: number,
  regime: string
): { level: ImpactLevel; headline: string; summary: string } {
  const labels: Record<string, string> = {
    simples:         "Simples Nacional",
    lucro_presumido: "Lucro Presumido",
    lucro_real:      "Lucro Real",
    autonomo:        "Autônomo",
  };
  const label = labels[regime] ?? regime;

  if (deltaPercent > 50) {
    return {
      level:    "high",
      headline: "Impacto SIGNIFICATIVO esperado no seu negócio",
      summary:  `Para ${label} no seu setor, a tributação sobre consumo pode aumentar consideravelmente até 2033. Planejamento tributário ainda em 2026 é essencial.`,
    };
  }
  if (deltaPercent > 15) {
    return {
      level:    "medium",
      headline: "Impacto MODERADO esperado no seu negócio",
      summary:  `Para ${label} no seu setor, estimamos aumento moderado nos tributos sobre consumo. Ainda há tempo para se preparar antes de 2027.`,
    };
  }
  if (deltaPercent < -10) {
    return {
      level:    "benefit",
      headline: "Você pode se BENEFICIAR da Reforma Tributária",
      summary:  `Para ${label} no seu setor, créditos do IVA e reduções de alíquota podem resultar em menor carga tributária sobre consumo até 2033.`,
    };
  }
  return {
    level:    "low",
    headline: "Impacto BAIXO esperado no seu negócio",
    summary:  `Para ${label} no seu setor, as mudanças devem ser relativamente neutras. Confirme os detalhes com seu contador.`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function calculate(
  input: SimulatorInput,
  data: ReformaData
): SimulatorResult {
  if (input.monthlyRevenue < 0 || !Number.isFinite(input.monthlyRevenue)) {
    throw new Error("monthlyRevenue inválido");
  }

  // Guard: invalid or missing regime falls back to a safe non-exempt default
  const regimeRule = data.regimeRules?.[input.regime] ?? { isExempt: false, exemptReason: undefined };

  if (regimeRule.isExempt) {
    return {
      impactLevel:  "exempt",
      headline:     "Você está ISENTO da Reforma Tributária",
      summary:      regimeRule.exemptReason ?? "Seu regime está isento de CBS e IBS.",
      projections:  buildProjections(input, data),
      actions:      buildActions(input, "exempt", data),
      faqs:         buildFAQs(input, data),
      isExempt:     true,
      exemptReason: regimeRule.exemptReason,
      legalRef:     regimeRule.legalRef,
    };
  }

  const projections = buildProjections(input, data);
  // Guard: 2033 projection may be absent if tax data has fewer years
  const finalYear   = projections.find((p) => p.year === 2033) ?? projections[projections.length - 1];
  const deltaPercent = finalYear?.deltaPercent ?? 0;
  const { level, headline, summary } = classifyImpact(deltaPercent, input.regime);

  return {
    impactLevel: level,
    headline,
    summary,
    projections,
    actions:  buildActions(input, level, data),
    faqs:     buildFAQs(input, data),
    isExempt: false,
    legalRef: data.sectorReductions[input.sector]?.legalRef
      ?? data.regimeRules[input.regime]?.legalRef,
  };
}
