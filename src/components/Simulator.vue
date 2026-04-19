<template>
  <div class="simulator-root max-w-3xl mx-auto">
    <div class="bg-white rounded-xl p-6 md:p-10 border border-[#C3C6D1]/10 shadow-[0_8px_24px_rgba(27,28,28,0.04)]">
     
    <!-- Wizard header -->
    <div class="mb-8 border-b border-[#E3E2E2] pb-6">
      <h2 class="font-['Public_Sans'] text-2xl md:text-3xl font-bold text-[#001E40] flex items-center gap-3">
        Simule o impacto da Reforma
        <span class="bg-[#002F74] text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider align-middle">Beta</span>
      </h2>
    </div>

    <!-- Progress: 5-step indicator -->
    <div v-if="step < 5" class="flex justify-between items-center mb-10 relative">
      <div class="absolute left-0 top-1/2 w-full h-0.5 bg-[#E3E2E2] -z-10"></div>
      <div class="absolute left-0 top-1/2 h-0.5 bg-[#001E40] -z-10 transition-all duration-300" :style="{ width: `${((step - 1) / 4) * 100}%` }"></div>
      
      <div class="flex flex-col items-center gap-2 bg-white px-2">
        <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors', step >= 1 ? (step > 1 ? 'bg-[#006C4B] text-white' : 'bg-[#001E40] text-white') : 'bg-[#E9E8E7] text-[#43474F]']">
          <span v-if="step > 1" class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">check</span>
          <span v-else>1</span>
        </div>
        <span class="text-xs font-medium" :class="step >= 1 ? 'text-[#001E40]' : 'text-[#43474F]'">Regime</span>
      </div>
      
      <div class="flex flex-col items-center gap-2 bg-white px-2">
        <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors', step >= 2 ? (step > 2 ? 'bg-[#006C4B] text-white' : 'bg-[#001E40] text-white') : 'bg-[#E9E8E7] text-[#43474F]']">
          <span v-if="step > 2" class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">check</span>
          <span v-else>2</span>
        </div>
        <span class="text-xs font-medium" :class="step >= 2 ? 'text-[#001E40]' : 'text-[#43474F]'">Setor</span>
      </div>
      
      <div class="flex flex-col items-center gap-2 bg-white px-2">
        <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors', step >= 3 ? (step > 3 ? 'bg-[#006C4B] text-white' : 'bg-[#001E40] text-white') : 'bg-[#E9E8E7] text-[#43474F]']">
          <span v-if="step > 3" class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">check</span>
          <span v-else>3</span>
        </div>
        <span class="text-xs font-medium" :class="step >= 3 ? 'text-[#001E40]' : 'text-[#43474F]'">Faturamento</span>
      </div>
      
      <div class="flex flex-col items-center gap-2 bg-white px-2">
        <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors', step >= 4 ? (step > 4 ? 'bg-[#006C4B] text-white' : 'bg-[#001E40] text-white') : 'bg-[#E9E8E7] text-[#43474F]']">
          <span v-if="step > 4" class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">check</span>
          <span v-else>4</span>
        </div>
        <span class="text-xs font-medium" :class="step >= 4 ? 'text-[#001E40]' : 'text-[#43474F]'">Estado</span>
      </div>
      
      <div class="flex flex-col items-center gap-2 bg-white px-2">
        <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors', step >= 5 ? 'bg-[#006C4B] text-white' : 'bg-[#E9E8E7] text-[#43474F]']">
          <span v-if="step > 5" class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">check</span>
          <span v-else>5</span>
        </div>
        <span class="text-xs font-medium" :class="step >= 5 ? 'text-[#001E40]' : 'text-[#43474F]'">Resultado</span>
      </div>
    </div>

    <!-- aria-live region for step transitions -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ stepAnnouncement }}
    </div>

    <!-- Error state -->
    <div v-if="simulateError" class="bg-[#FFDAD6] border border-[#BA1A1A]/20 rounded-lg p-4 flex items-start gap-3 mb-6" role="alert">
      <span class="material-symbols-outlined text-[#BA1A1A] mt-0.5" style="font-variation-settings: 'FILL' 1;">warning</span>
      <div class="flex-1">
        <div class="font-semibold text-[#93000A]">Erro ao calcular a simulação</div>
        <div class="text-sm text-[#93000A]/80 mt-1">{{ simulateError }}</div>
      </div>
      <button class="text-[#93000A] hover:text-[#BA1A1A] p-1" @click="simulateError = null" aria-label="Fechar">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">close</span>
      </button>
    </div>

    <!-- Invalid URL params warning -->
    <div v-if="invalidUrlParams" class="bg-[#FFF8E1] border border-[#FFC107]/40 rounded-lg p-4 flex items-start gap-3 mb-6" role="alert">
      <span class="material-symbols-outlined text-[#F9A825] mt-0.5" style="font-variation-settings: 'FILL' 1;">link_off</span>
      <div class="flex-1">
        <div class="font-semibold text-[#5D4037]">Link de compartilhamento inválido</div>
        <div class="text-sm text-[#5D4037]/80 mt-1">Iniciando simulador vazio. Os parâmetros do link estão incorretos ou expiraram.</div>
      </div>
      <button class="text-[#5D4037] hover:text-[#5D4037]/70 p-1" @click="invalidUrlParams = false" aria-label="Fechar">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">close</span>
      </button>
    </div>

    <!-- Step 1: Regime -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 1" key="step1">
        <h3 id="regime-label" class="text-lg font-semibold text-[#1B1C1C] mb-2">Qual o regime tributário atual da sua empresa?</h3>
        <p class="text-sm text-[#43474F] mb-6">
          Se não souber, pergunte ao seu contador ou verifique no CNPJ.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4" role="radiogroup" aria-labelledby="regime-label">
          <label
            v-for="r in regimes"
            :key="r.value"
            class="cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-[#001E40]/50 focus-within:ring-offset-2 rounded-lg transition-all duration-200"
            role="radio"
            :aria-checked="String(form.regime === r.value)"
            @click="selectRegime(r.value)"
          >
            <div
              :class="[
                'relative flex flex-col items-start p-5 border-2 transition-all duration-200 rounded-lg min-h-[140px]',
                form.regime === r.value
                  ? 'bg-[#D5E3FF]/20 border-[#001E40]'
                  : 'bg-[#F5F3F3] border-transparent hover:bg-[#E9E8E7]',
              ]"
            >
              <span class="material-symbols-outlined text-2xl mb-2" style="font-variation-settings: 'FILL' 1;">{{ r.icon }}</span>
              <div class="font-semibold text-sm text-[#1B1C1C] mb-1">{{ r.label }}</div>
              <div class="text-xs text-[#43474F] leading-snug">{{ r.hint }}</div>
              <div
                v-if="r.isExempt"
                class="absolute top-3 right-3"
              >
                <span class="material-symbols-outlined text-[#006C4B]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              </div>
            </div>
          </label>
        </div>

        <div class="mt-8 flex justify-end">
          <button
            class="bg-[#001E40] hover:bg-[#003366] text-white px-8 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
            :disabled="!form.regime"
            @click="next"
          >
            Próximo Passo
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">arrow_forward</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Sector (skip if exempt) -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 2" key="step2">
        <h3 id="sector-label" class="text-lg font-semibold text-[#1B1C1C] mb-2">Qual é o seu setor de atividade?</h3>
        <p class="text-sm text-[#43474F] mb-6">
          O setor define se você tem direito a reduções de alíquota na reforma.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-labelledby="sector-label">
          <label
            v-for="s in sectors"
            :key="s.value"
            class="cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-[#001E40]/50 focus-within:ring-offset-2 rounded-md transition-all duration-200"
            role="radio"
            :aria-checked="String(form.sector === s.value)"
            @click="form.sector = s.value"
          >
            <div
              :class="[
                'flex items-center gap-3 p-4 border-2 transition-all duration-200 rounded-lg min-h-[72px]',
                form.sector === s.value
                  ? 'bg-[#D5E3FF]/20 border-[#001E40]'
                  : 'bg-[#F5F3F3] border-transparent hover:bg-[#E9E8E7]',
              ]"
            >
              <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">{{ s.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-[#1B1C1C] truncate">{{ s.label }}</div>
                <div
                  v-if="s.reduction"
                  class="inline-block mt-1"
                >
                  <span class="bg-[#9AF5CA] text-[#006C4B] px-2 py-0.5 rounded text-xs font-medium">{{ s.reduction }}</span>
                </div>
              </div>
            </div>
          </label>
        </div>

        <div class="mt-8 flex justify-between">
          <button class="text-[#43474F] hover:text-[#001E40] flex items-center gap-1 font-medium transition-colors" @click="back">
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">arrow_back</span>
            Voltar
          </button>
          <button
            class="bg-[#001E40] hover:bg-[#003366] text-white px-8 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
            :disabled="!form.sector"
            @click="next"
          >
            Próximo Passo
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">arrow_forward</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Revenue -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 3" key="step3">
        <h3 class="text-lg font-semibold text-[#1B1C1C] mb-2">Qual é o seu faturamento mensal?</h3>
        <p class="text-sm text-[#43474F] mb-6">
          Valor aproximado. Usado para estimar o impacto em reais.
        </p>

        <!-- Quick options -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <button
            v-for="opt in revenueOptions"
            :key="opt.value"
            :class="[
              'py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 border min-h-[64px] flex items-center justify-center',
              form.monthlyRevenue === opt.value
                ? 'bg-[#001E40] text-white border-[#001E40] shadow-sm'
                : 'bg-white text-[#1B1C1C] border-[#C3C6D1]/40 hover:bg-[#F5F3F3]',
            ]"
            @click="form.monthlyRevenue = opt.value; customRevenue = ''"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Custom input -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-[#43474F] mb-2">Ou informe o valor exato:</label>
          <div class="flex items-stretch">
            <span class="bg-[#E9E8E7] flex items-center px-4 rounded-l-lg border border-[#C3C6D1]/40 border-r-0 text-[#43474F] text-sm font-medium">R$</span>
            <input
              v-model="customRevenue"
              type="number"
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder="Ex: 45000"
              min="1"
              :max="MAX_MONTHLY_REVENUE"
              class="flex-1 px-4 py-2.5 rounded-r-lg border border-[#C3C6D1]/40 bg-white text-[#1B1C1C] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#001E40]/50 focus:border-[#001E40] transition-all"
              @input="onCustomRevenue"
            />
          </div>
          <p v-if="customRevenueError" class="text-xs text-[#BA1A1A] mt-2">{{ customRevenueError }}</p>
        </div>

        <div v-if="form.monthlyRevenue" class="bg-[#F5F3F3] border-l-4 border-[#006C4B] rounded-r-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-sm text-[#43474F]">
            <span class="material-symbols-outlined text-[#006C4B]" style="font-variation-settings: 'FILL' 1;">info</span>
            <span>Faturamento selecionado: <strong class="text-[#001E40]">{{ formatCurrency(form.monthlyRevenue) }}/mês</strong> ({{ formatCurrency(form.monthlyRevenue * 12) }}/ano)</span>
          </div>
        </div>

        <div class="flex justify-between">
          <button class="text-[#43474F] hover:text-[#001E40] flex items-center gap-1 font-medium transition-colors" @click="back">
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">arrow_back</span>
            Voltar
          </button>
          <button
            class="bg-[#001E40] hover:bg-[#003366] text-white px-8 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
            :disabled="!form.monthlyRevenue || form.monthlyRevenue <= 0"
            @click="next"
          >
            Próximo Passo
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">arrow_forward</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Location (UF) — Optional -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 4" key="step4">
        <h3 class="text-lg font-semibold text-[#1B1C1C] mb-2">Em qual estado fica sua empresa?</h3>
        <p class="text-sm text-[#43474F] mb-6">
          A alíquota do IBS varia por município. Se preferir, pule esta etapa para usar média nacional.
        </p>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <button
            v-for="uf in ufList"
            :key="uf.code"
            :class="[
              'py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 border min-h-[64px] flex flex-col items-center justify-center',
              form.uf === uf.code
                ? 'bg-[#001E40] text-white border-[#001E40] shadow-sm'
                : 'bg-white text-[#1B1C1C] border-[#C3C6D1]/40 hover:bg-[#F5F3F3]',
            ]"
            @click="selectUf(uf.code)"
          >
            <span class="font-bold">{{ uf.code }}</span>
            <span class="text-xs opacity-80">{{ uf.name }}</span>
          </button>
        </div>

        <div class="bg-[#F5F3F3] border-l-4 border-[#5E6F83] rounded-r-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-sm text-[#43474F]">
            <span class="material-symbols-outlined text-[#5E6F83]" style="font-variation-settings: 'FILL' 1;">info</span>
            <span v-if="form.uf">UF selecionada: <strong class="text-[#001E40]">{{ form.uf }}</strong></span>
            <span v-else>Nenhuma UF selecionada — usando média nacional</span>
          </div>
        </div>

        <div class="flex justify-between">
          <button class="text-[#43474F] hover:text-[#001E40] flex items-center gap-1 font-medium transition-colors" @click="back">
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">arrow_back</span>
            Voltar
          </button>
          <button
            class="bg-[#001E40] hover:bg-[#003366] text-white px-8 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
            @click="simulate"
          >
            <span v-if="!loading">Simular agora</span>
            <span v-else class="animate-spin material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">sync</span>
            <span v-if="!loading" class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">arrow_forward</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Result -->
    <Transition name="step" mode="out-in">
      <SimulatorResult
        v-if="step === 5 && result"
        :result="result"
        :input="form"
        @restart="restart"
      />
    </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import SimulatorResult from "./SimulatorResult.vue";
import type { SimulatorInput, SimulatorResult as IResult, TaxRegime, Sector } from "../lib/types.ts";
import { UF_LIST } from "../lib/ncmMapping.ts";

// ─── URL Params Initialization ───────────────────────────────────────────
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const pRegime = params.get("regime");
  const pSector = params.get("setor");
  const pFat = params.get("fat");

  const validRegimes = regimes.map(r => r.value);
  const validSectors = sectors.map(s => s.value);

  if (pRegime && pSector && pFat) {
    const fat = parseFloat(pFat);
    if (
      validRegimes.includes(pRegime as any) &&
      validSectors.includes(pSector as any) &&
      !isNaN(fat) && fat >= MIN_MONTHLY_REVENUE && fat <= MAX_MONTHLY_REVENUE
    ) {
      form.regime = pRegime as TaxRegime;
      form.sector = pSector as Sector;
      form.monthlyRevenue = fat;
      simulate();
      return;
    }
    invalidUrlParams.value = true;
  } else if (pRegime || pSector || pFat) {
    invalidUrlParams.value = true;
  }
});

// Props: tax data injected from Astro at build time
const props = defineProps<{
  taxData: any;
}>();

// ─── State ────────────────────────────────────────────────────────────────────
const step = ref(1);
const loading = ref(false);
const result = ref<IResult | null>(null);
const customRevenue = ref("");
const simulateError = ref<string | null>(null);
const invalidUrlParams = ref(false);

// Revenue constraints
const MAX_MONTHLY_REVENUE = 6_500_000; // R$78M/ano (Lucro Real limit)
const MIN_MONTHLY_REVENUE = 1;

const stepLabels = ["", "Passo 1: Regime tributário", "Passo 2: Setor de atividade", "Passo 3: Faturamento mensal", "Passo 4: Estado", "Resultado da simulação"];
const stepAnnouncement = computed(() => stepLabels[step.value] ?? "");

const form = reactive<SimulatorInput>({
  regime: "" as TaxRegime,
  sector: "" as Sector,
  monthlyRevenue: 0,
  uf: "",
  municipioIbge: "",
});

const ufList = UF_LIST;

// ─── Regime options ───────────────────────────────────────────────────────────
const regimes = [
  {
    value: "mei",
    label: "MEI – Microempreendedor Individual",
    hint: "Faturamento até R$81.000/ano, paga DAS fixo",
    icon: "handyman",
    isExempt: true,
  },
  {
    value: "nano",
    label: "Nanoempreendedor",
    hint: "Nova categoria, faturamento até R$40.500/ano",
    icon: "eco",
    isExempt: true,
  },
  {
    value: "simples",
    label: "Simples Nacional",
    hint: "ME ou EPP, faturamento até R$4,8M/ano",
    icon: "storefront",
    isExempt: false,
  },
  {
    value: "lucro_presumido",
    label: "Lucro Presumido",
    hint: "Faturamento até R$78M/ano, tributação simplificada",
    icon: "apartment",
    isExempt: false,
  },
  {
    value: "lucro_real",
    label: "Lucro Real",
    hint: "Tributação sobre lucro efetivo, com créditos completos",
    icon: "account_balance",
    isExempt: false,
  },
  {
    value: "autonomo",
    label: "Autônomo / Sem CNPJ",
    hint: "Pessoa física que presta serviços",
    icon: "person",
    isExempt: false,
  },
];

// ─── Sector options ───────────────────────────────────────────────────────────
const sectors = [
  { value: "comercio",                  label: "Comérico / Varejo",              icon: "storefront", reduction: null },
  { value: "servicos",                  label: "Serviços em geral",              icon: "build", reduction: null },
  { value: "saude",                     label: "Saúde",                          icon: "local_hospital", reduction: "60% redução" },
  { value: "educacao",                  label: "Educação / Cursos",              icon: "school", reduction: "60% redução" },
  { value: "alimentacao",               label: "Alimentação / Restaurante",      icon: "restaurant", reduction: "20% redução" },
  { value: "construcao",                label: "Construção Civil",               icon: "construction", reduction: null },
  { value: "transporte",                label: "Transporte / Logística",         icon: "local_shipping", reduction: "40% redução" },
  { value: "tecnologia",                label: "Tecnologia / Software",          icon: "laptop", reduction: null },
  { value: "profissoes_regulamentadas", label: "Advocacia / Contabilidade / Eng.", icon: "balance", reduction: "30% redução" },
  { value: "agronegocio",               label: "Agronegrocio",                    icon: "agriculture", reduction: "Regime especial" },
  { value: "outro",                     label: "Outro setor",                    icon: "list_alt", reduction: null },
];

// ─── Revenue quick options ────────────────────────────────────────────────────
const revenueOptions = [
  { label: "R$3.000", value: 3000 },
  { label: "R$6.750", value: 6750 },
  { label: "R$10.000", value: 10000 },
  { label: "R$20.000", value: 20000 },
  { label: "R$50.000", value: 50000 },
  { label: "R$100.000+", value: 100000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(val: number) {
  if (!isFinite(val) || isNaN(val)) return "R$ —";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const customRevenueError = ref<string | null>(null);

function onCustomRevenue() {
  customRevenueError.value = null;
  const raw = customRevenue.value.trim();

  if (raw === "") {
    // User cleared the field — don't change form value
    return;
  }

  const val = parseFloat(raw);

  if (isNaN(val)) {
    customRevenueError.value = "Digite apenas números.";
    return;
  }
  if (val <= 0) {
    customRevenueError.value = "O faturamento deve ser maior que zero.";
    return;
  }
  if (val < MIN_MONTHLY_REVENUE) {
    customRevenueError.value = `Valor mínimo: ${formatCurrency(MIN_MONTHLY_REVENUE)}.`;
    return;
  }
  if (val > MAX_MONTHLY_REVENUE) {
    customRevenueError.value = `Valor máximo: ${formatCurrency(MAX_MONTHLY_REVENUE)}/mês (R$78M/ano).`;
    form.monthlyRevenue = MAX_MONTHLY_REVENUE;
    return;
  }

  form.monthlyRevenue = val;
}

// ─── URL State Sync ────────────────────────────────────────────────────────────
function updateUrl() {
  const url = new URL(window.location.href);
  if (form.regime) url.searchParams.set("regime", form.regime);
  if (form.sector) url.searchParams.set("setor", form.sector);
  if (form.monthlyRevenue > 0) url.searchParams.set("fat", String(Math.round(form.monthlyRevenue)));
  if (form.uf) url.searchParams.set("uf", form.uf);
  window.history.replaceState({}, "", url.toString());
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function selectRegime(val: TaxRegime) {
  form.regime = val;
  updateUrl();
}

function selectUf(code: string) {
  form.uf = form.uf === code ? "" : code;
  const uf = UF_LIST.find(u => u.code === code);
  if (uf) {
    form.municipioIbge = uf.ibge + "0308"; // Default to capital IBGE
  }
}

function next() {
  step.value++;
  if (step.value === 5) {
    updateUrl();
  }
}

function back() {
  step.value--;
  result.value = null;
}

function restart() {
  step.value = 1;
  form.regime = "" as TaxRegime;
  form.sector = "" as Sector;
  form.monthlyRevenue = 0;
  form.uf = "";
  form.municipioIbge = "";
  customRevenue.value = "";
  customRevenueError.value = null;
  simulateError.value = null;
  invalidUrlParams.value = false;
  result.value = null;
  window.history.replaceState({}, "", window.location.pathname);
}

// ─── Simulate ─────────────────────────────────────────────────────────────────
async function simulate() {
  simulateError.value = null;
  loading.value = true;

  try {
    // Simulate async (gives UI time to show spinner)
    await new Promise((r) => setTimeout(r, 400));

    if (form.uf) {
      // Call real-time API with location
      const res = await fetch("/api/calculate-real", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regime: form.regime,
          sector: form.sector || "outro",
          monthlyRevenue: form.monthlyRevenue,
          uf: form.uf,
          municipioIbge: form.municipioIbge,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.result) {
          result.value = data.result;
          step.value = 5;
          document.querySelector(".simulator-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
          loading.value = false;
          return;
        }
      }
      // Fall through to local calculation if API fails
    }

    // Local calculation fallback
    const { calculate } = await import("../lib/taxCalculator.ts");

    result.value = calculate(
      {
        regime: form.regime,
        sector: form.sector || "outro",
        monthlyRevenue: form.monthlyRevenue,
        uf: form.uf || undefined,
        municipioIbge: form.municipioIbge || undefined,
      },
      props.taxData
    );

    step.value = 5;

    // Scroll to top of simulator
    document.querySelector(".simulator-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    simulateError.value = `Não foi possível calcular a simulação. ${message} Tente novamente ou recarregue a página.`;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition: transform 250ms ease-in-out, opacity 250ms ease-in-out;
}

.step-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.step-enter-to {
  transform: translateX(0);
  opacity: 1;
}

.step-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.step-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Respect user's motion preference */
@media (prefers-reduced-motion: reduce) {
  .step-enter-active,
  .step-leave-active {
    transition: opacity 150ms ease;
  }
  .step-enter-from,
  .step-leave-to {
    transform: none;
  }
}
</style>
