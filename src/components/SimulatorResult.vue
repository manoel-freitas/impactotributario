<template>
  <div class="result-root space-y-6">

    <!-- Impact badge -->
    <div :class="['alert', alertClass]">
      <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">{{ impactIcon }}</span>
      <div>
        <h3 class="font-bold text-base sm:text-lg">{{ result.headline }}</h3>
        <p class="text-sm mt-1">{{ result.summary }}</p>
      </div>
    </div>

    <!-- Exempt: simplified view -->
    <template v-if="result.isExempt">
      <div class="border-l-4 border-success pl-4 py-2 bg-success/5 rounded-sm">
        <h4 class="font-semibold text-success mb-1"><span class="material-symbols-outlined mr-1" style="font-variation-settings: 'FILL' 1;">check_circle</span>Por que você está isento?</h4>
        <p class="text-sm">{{ result.exemptReason }}</p>
      </div>
    </template>

    <!-- Non-exempt: projections timeline -->
    <template v-else>
      <div class="space-y-4">
          <h4 class="font-semibold mb-2 flex items-center gap-2">
            Cronograma de impacto (2026–2033)
            <span class="badge badge-ghost badge-sm">Estimativa</span>
          </h4>

          <!-- Mobile: cards por ano -->
          <div class="block sm:hidden space-y-2">
            <div
              v-for="proj in result.projections"
              :key="proj.year + '-card'"
              :class="['rounded-md border p-4', proj.year === 2027 ? 'border-warning bg-warning/5' : 'border-base-300 bg-base-100']"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="font-mono font-bold text-base">{{ proj.year }}</span>
                <span :class="['badge badge-sm', phaseClass(proj.phase)]">{{ phaseLabel(proj.phase) }}</span>
              </div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                <div>
                  <p class="text-xs text-base-content/50 mb-0.5">Imposto atual</p>
                  <p class="font-medium">{{ fmt(proj.estimatedTaxBefore / 12) }}/mês</p>
                </div>
                <div>
                  <p class="text-xs text-base-content/50 mb-0.5">Novo imposto</p>
                  <p class="font-medium">{{ fmt(proj.estimatedTaxAfter / 12) }}/mês</p>
                </div>
              </div>
              <div class="pt-2 border-t border-base-200">
                <span :class="['font-semibold text-sm', deltaClass(proj.delta)]">
                  {{ proj.delta >= 0 ? "+" : "" }}{{ fmt(proj.delta / 12) }}/mês
                  <span class="text-xs opacity-70">({{ proj.deltaPercent >= 0 ? "+" : "" }}{{ proj.deltaPercent.toFixed(0) }}%)</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Desktop: tabela padrão -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Fase</th>
                  <th>Imposto atual</th>
                  <th>Novo imposto</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="proj in result.projections"
                  :key="proj.year"
                  :class="proj.year === 2027 ? 'bg-warning/10' : ''"
                >
                  <td class="font-mono font-bold">{{ proj.year }}</td>
                  <td>
                    <span :class="['badge badge-sm', phaseClass(proj.phase)]">
                      {{ phaseLabel(proj.phase) }}
                    </span>
                  </td>
                  <td class="text-sm">{{ fmt(proj.estimatedTaxBefore / 12) }}/mês</td>
                  <td class="text-sm">{{ fmt(proj.estimatedTaxAfter / 12) }}/mês</td>
                  <td>
                    <span :class="['font-semibold text-sm', deltaClass(proj.delta)]">
                      {{ proj.delta >= 0 ? "+" : "" }}{{ fmt(proj.delta / 12) }}/mês
                      <span class="text-xs opacity-70">({{ proj.deltaPercent >= 0 ? "+" : "" }}{{ proj.deltaPercent.toFixed(0) }}%)</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Phase legend -->
          <div class="flex flex-wrap gap-2 text-xs text-base-content/50">
            <span class="flex items-center gap-1"><span class="badge badge-ghost badge-xs">Teste</span> 2026: sem cobrança efetiva</span>
            <span class="flex items-center gap-1"><span class="badge badge-warning badge-xs">Transição</span> CBS e IBS gradual</span>
            <span class="flex items-center gap-1"><span class="badge badge-primary badge-xs">Final</span> sistema completo</span>
          </div>

          <!-- Official calculator callout -->
          <div class="border border-[#C3C6D1]/30 rounded-md p-4 bg-[#F5F3F3]/50">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-xl text-[#001E40]" style="font-variation-settings: 'FILL' 1;">open_in_new</span>
              <div class="flex-1">
                <h4 class="font-semibold text-sm text-[#001E40] mb-1">Calculadora oficial do governo</h4>
                <p class="text-xs text-[#5E6F83] mb-2">Compare esta estimativa com a ferramenta oficial da Receita Federal para CBS.</p>
                <a
                  href="https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/calculadora"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm font-semibold text-[#001E40] hover:underline inline-flex items-center gap-1"
                >
                  Acessar calculadora
                  <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>

      <!-- SVG line chart: all years 2026–2033 -->
      <div class="space-y-4">
          <h4 class="font-semibold mb-4">Evolução da carga tributária (2026–2033)</h4>
          <div class="relative" ref="chartContainer">
            <svg
              viewBox="0 0 600 220"
              width="100%"
              aria-label="Gráfico de evolução tributária"
              @mouseleave="tooltip.visible = false"
            >
              <!-- Horizontal grid lines -->
              <line
                v-for="tick in chartData.yTicks"
                :key="tick.value"
                :x1="chartData.padLeft"
                :y1="tick.y"
                :x2="600 - chartData.padRight"
                :y2="tick.y"
                stroke="#C3C6D1"
                stroke-width="1"
                stroke-dasharray="4 4"
              />
              <!-- Y axis labels -->
              <text
                v-for="tick in chartData.yTicks"
                :key="'yl' + tick.value"
                :x="chartData.padLeft - 6"
                :y="tick.y + 4"
                text-anchor="end"
                font-size="14"
                fill="#5E6F83"
              >{{ tick.label }}</text>

              <!-- X axis labels -->
              <text
                v-for="pt in chartData.points"
                :key="'xl' + pt.year"
                :x="pt.x"
                :y="200"
                text-anchor="middle"
                font-size="11"
                fill="#5E6F83"
              >{{ pt.year }}</text>

              <!-- Line: current tax (before) -->
              <polyline
                :points="chartData.points.map(p => `${p.x},${p.yBefore}`).join(' ')"
                fill="none"
                stroke="#5E6F83"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <!-- Line: new tax (after) -->
              <polyline
                :points="chartData.points.map(p => `${p.x},${p.yAfter}`).join(' ')"
                fill="none"
                stroke="#006C4B"
                stroke-width="2"
                stroke-linejoin="round"
              />

              <!-- Data circles: current (before) -->
              <circle
                v-for="pt in chartData.points"
                :key="'cb' + pt.year"
                :cx="pt.x"
                :cy="pt.yBefore"
                r="5"
                fill="#5E6F83"
                stroke="white"
                stroke-width="1.5"
                style="cursor:pointer"
                tabindex="0"
                :aria-label="`Ano ${pt.year}: atual ${fmt(pt.monthlyBefore)}/mês, novo ${fmt(pt.monthlyAfter)}/mês`"
                @mouseover="showTooltip(pt, $event)"
              />
              <!-- Data circles: new (after) -->
              <circle
                v-for="pt in chartData.points"
                :key="'ca' + pt.year"
                :cx="pt.x"
                :cy="pt.yAfter"
                r="5"
                fill="#006C4B"
                stroke="white"
                stroke-width="1.5"
                style="cursor:pointer"
                tabindex="0"
                :aria-label="`Ano ${pt.year}: atual ${fmt(pt.monthlyBefore)}/mês, novo ${fmt(pt.monthlyAfter)}/mês`"
                @mouseover="showTooltip(pt, $event)"
              />
            </svg>

            <!-- Tooltip -->
            <div
              v-if="tooltip.visible"
              :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
              class="absolute z-10 pointer-events-none bg-base-100 border border-base-300 rounded-md px-3 py-2 text-xs min-w-[160px]"
            >
              <div class="font-bold mb-1">{{ tooltip.year }}</div>
              <div class="flex items-center gap-1 mb-0.5">
                <span class="inline-block w-2 h-2 rounded-full" style="background:#5E6F83"></span>
                Atual: {{ tooltip.before }}
              </div>
              <div class="flex items-center gap-1 mb-0.5">
                <span class="inline-block w-2 h-2 rounded-full" style="background:#006C4B"></span>
                Novo: {{ tooltip.after }}
              </div>
              <div :class="tooltip.deltaPositive ? 'text-error' : 'text-success'" class="mt-1 font-semibold">
                {{ tooltip.deltaSign }}{{ tooltip.delta }} ({{ tooltip.deltaSign }}{{ tooltip.deltaPercent }}%)
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex gap-5 mt-2 text-xs text-base-content/70">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-5 h-0.5" style="background:#5E6F83"></span> Imposto atual
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-5 h-0.5" style="background:#006C4B"></span> Novo imposto
            </span>
          </div>
          <p class="text-xs text-base-content/40 mt-2">* Valores mensais estimados com base no seu faturamento e setor. Consulte um contador.</p>
        </div>
    </template>

    <!-- Actions checklist -->
    <div class="space-y-3">
        <h4 class="font-semibold">O que fazer agora</h4>
        <ul v-if="result.actions?.length" class="space-y-2">
          <li
            v-for="(action, i) in result.actions"
            :key="i"
            class="text-sm flex gap-2"
          >
            <span class="flex-none mt-0.5 text-[#006C4B]">•</span>
            <span class="break-words min-w-0">{{ action }}</span>
          </li>
        </ul>
        <p v-else class="text-sm text-base-content/50">Nenhuma ação disponível para o seu perfil.</p>
      </div>

    <!-- FAQ -->
    <div class="space-y-3">
        <h4 class="font-semibold">Perguntas frequentes para o seu perfil</h4>
        <div v-if="result.faqs?.length" class="join join-vertical w-full">
          <div
            v-for="(faq, i) in result.faqs"
            :key="i"
            class="collapse collapse-arrow join-item border border-base-200"
          >
            <input type="radio" name="faq" />
            <div class="collapse-title text-sm font-medium">{{ faq.q }}</div>
            <div class="collapse-content text-sm text-base-content/70">
              <p>{{ faq.a }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-base-content/50">Nenhuma pergunta frequente disponível.</p>
      </div>

    <!-- Disclaimer -->
    <div class="alert alert-warning text-sm">
      <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">warning</span>
      <span>
        Esta é uma <strong>estimativa educacional</strong> baseada na LC 214/2025 e EC 132/2023.
        Os valores reais dependem de fatores específicos da sua empresa.
        Consulte um contador para decisões fiscais.
      </span>
    </div>

    <!-- Share + Restart -->
    <div class="flex flex-wrap gap-3 justify-center">
      <button class="btn btn-outline" @click="share" aria-label="Compartilhar resultado da simulação">
        <span class="material-symbols-outlined mr-1" style="font-variation-settings: 'FILL' 0;">share</span> Compartilhar resultado
      </button>
      <button class="btn btn-ghost" @click="$emit('restart')" aria-label="Iniciar nova simulação">
        <span class="material-symbols-outlined mr-1" style="font-variation-settings: 'FILL' 0;">restart_alt</span> Nova simulação
      </button>
    </div>

  </div>

  <!-- Toast: link copiado -->
  <div v-if="showCopiedToast" class="toast toast-end" aria-live="polite">
    <div class="alert alert-success text-sm">
      <span class="material-symbols-outlined mr-1" style="font-variation-settings: 'FILL' 1;">check</span>Link copiado! Cole no WhatsApp ou envie ao seu contador.
    </div>
  </div>

  <!-- Toast: share error -->
  <div v-if="shareError" class="toast toast-end" aria-live="assertive">
    <div class="alert alert-error text-sm">
      <span class="material-symbols-outlined mr-1" style="font-variation-settings: 'FILL' 1;">warning</span>Não foi possível compartilhar. Copie o endereço da barra do navegador.
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { SimulatorResult, SimulatorInput, YearProjection } from "../lib/types.ts";

const props = defineProps<{
  result: SimulatorResult;
  input: SimulatorInput;
}>();

const emit = defineEmits(["restart"]);

// ─── Formatting ───────────────────────────────────────────────────────────────
function fmt(val: number) {
  if (val == null || !isFinite(val) || isNaN(val)) return "R$ —";
  return Math.abs(val).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// ─── Impact styles ────────────────────────────────────────────────────────────
const alertClass = computed(() => {
  const map: Record<string, string> = {
    exempt:  "alert-success",
    low:     "alert-info",
    medium:  "alert-warning",
    high:    "alert-error",
    benefit: "alert-success",
  };
  return map[props.result.impactLevel] ?? "alert-info";
});

const impactIcon = computed(() => {
  const map: Record<string, string> = {
    exempt:  "celebration",
    low:     "check_circle",
    medium:  "bar_chart",
    high:    "warning",
    benefit: "trending_up",
  };
  return map[props.result.impactLevel] ?? "bar_chart";
});

// ─── Phase labels ─────────────────────────────────────────────────────────────
function phaseLabel(phase: YearProjection["phase"]) {
  return { test: "Teste", transition: "Transição", final: "Final" }[phase];
}

function phaseClass(phase: YearProjection["phase"]) {
  return {
    test:       "badge-ghost",
    transition: "badge-warning",
    final:      "badge-primary",
  }[phase];
}

function deltaClass(delta: number) {
  if (delta > 0) return "text-error";
  if (delta < 0) return "text-success";
  return "text-base-content";
}

// ─── SVG Line chart ───────────────────────────────────────────────────────────
const chartContainer = ref<HTMLElement | null>(null);

const SVG_W = 600;
const SVG_H = 220;
const PAD_LEFT = 52;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32; // room for x labels (rendered at y=200)

const chartData = computed(() => {
  const proj = props.result.projections;
  if (!proj || proj.length === 0) return { points: [], yTicks: [], padLeft: PAD_LEFT, padRight: PAD_RIGHT };

  const allValues = proj.flatMap((p) => [p.estimatedTaxBefore / 12, p.estimatedTaxAfter / 12]);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  // Add 10% padding to value range
  const span = rawMax - rawMin || 1;
  const vMin = Math.max(0, rawMin - span * 0.1);
  const vMax = rawMax + span * 0.1;

  const xMin = PAD_LEFT;
  const xMax = SVG_W - PAD_RIGHT;
  const yMin = PAD_TOP;
  const yMax = SVG_H - PAD_BOTTOM;

  const toX = (i: number) => xMin + (i / (proj.length - 1)) * (xMax - xMin);
  const toY = (v: number) => yMax - ((v - vMin) / (vMax - vMin)) * (yMax - yMin);

  const points = proj.map((p, i) => ({
    year: p.year,
    x: toX(i),
    yBefore: toY(p.estimatedTaxBefore / 12),
    yAfter: toY(p.estimatedTaxAfter / 12),
    monthlyBefore: p.estimatedTaxBefore / 12,
    monthlyAfter: p.estimatedTaxAfter / 12,
    delta: p.delta / 12,
    deltaPercent: p.deltaPercent,
  }));

  // Y axis ticks: ~4 evenly spaced
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = vMin + (i / tickCount) * (vMax - vMin);
    return {
      value: v,
      y: toY(v),
      label: fmtAbbr(v),
    };
  });

  return { points, yTicks, padLeft: PAD_LEFT, padRight: PAD_RIGHT };
});

function fmtAbbr(val: number): string {
  if (val == null || !isFinite(val) || isNaN(val)) return "R$—";
  if (val >= 1_000_000) return `R$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$${(val / 1_000).toFixed(0)}k`;
  return `R$${val.toFixed(0)}`;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  year: 0,
  before: "",
  after: "",
  delta: "",
  deltaPercent: "",
  deltaSign: "",
  deltaPositive: false,
});

function showTooltip(pt: (typeof chartData.value.points)[number], event: MouseEvent) {
  const container = chartContainer.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  // Convert SVG logical x to container pixel x
  const svgEl = container.querySelector("svg") as SVGSVGElement | null;
  let px = event.clientX - rect.left + 12;
  let py = event.clientY - rect.top - 60;
  if (svgEl) {
    const svgRect = svgEl.getBoundingClientRect();
    const scale = svgRect.width / SVG_W;
    px = pt.x * scale - rect.left + svgRect.left + 12;
    py = Math.min(pt.yBefore, pt.yAfter) * scale - 80;
  }
  tooltip.value = {
    visible: true,
    x: Math.min(px, rect.width - 170),
    y: Math.max(py, 4),
    year: pt.year,
    before: fmt(pt.monthlyBefore) + "/mês",
    after: fmt(pt.monthlyAfter) + "/mês",
    delta: fmt(Math.abs(pt.delta)) + "/mês",
    deltaPercent: Math.abs(pt.deltaPercent).toFixed(0),
    deltaSign: pt.delta >= 0 ? "+" : "-",
    deltaPositive: pt.delta > 0,
  };
}

// ─── Share ────────────────────────────────────────────────────────────────────
const showCopiedToast = ref(false);
const shareError = ref(false);

async function share() {
  shareError.value = false;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("regime", props.input.regime);
    url.searchParams.set("setor", props.input.sector);
    url.searchParams.set("fat", String(props.input.monthlyRevenue));

    if (navigator.share) {
      await navigator.share({
        title: "Meu resultado no Simulador da Reforma Tributária",
        text: props.result.headline,
        url: url.toString(),
      });
    } else {
      await navigator.clipboard.writeText(url.toString());
      showCopiedToast.value = true;
      setTimeout(() => { showCopiedToast.value = false; }, 2000);
    }
  } catch (err) {
    // User cancelled navigator.share → AbortError, which is expected — don't show error
    if (err instanceof Error && err.name === "AbortError") return;
    // Real failure (no clipboard permission, insecure context, etc.)
    shareError.value = true;
    setTimeout(() => { shareError.value = false; }, 3000);
  }
}
</script>
