<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Scale, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  Award,
  AlertCircle
} from 'lucide-vue-next';
import type { 
  WeightLog, 
  WeightTimeframePeriod, 
  WeightChartPoint, 
  WeightStatsSummary 
} from '~/types/baby-tracker';

const props = defineProps<{
  weights: WeightLog[];
  stats: WeightStatsSummary;
  getChartPoints: (period: WeightTimeframePeriod) => WeightChartPoint[];
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-create'): void;
  (e: 'open-edit', weight: WeightLog): void;
  (e: 'delete-weight', id: string): void;
}>();

const activePeriod = ref<WeightTimeframePeriod>('all');
const activeHoveredPointIndex = ref<number | null>(null);
const weightToDelete = ref<WeightLog | null>(null);

// Get deduplicated points for the selected timeframe
const chartPoints = computed<WeightChartPoint[]>(() => {
  return props.getChartPoints(activePeriod.value);
});

// Calculate delta relative to next older record in the full weights list
const getWeightDeltaFromNext = (currentIndex: number): number | null => {
  if (currentIndex >= props.weights.length - 1) return null;
  const current = props.weights[currentIndex];
  const previousOlder = props.weights[currentIndex + 1];
  return Math.round((Number(current.weight_kg) - Number(previousOlder.weight_kg)) * 1000);
};

const formatDate = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ------------------------------------------------------------------------------
// SVG CHART COMPUTATION & GEOMETRY
// ------------------------------------------------------------------------------
const svgWidth = 500;
const svgHeight = 220;
const padLeft = 46;
const padRight = 24;
const padTop = 28;
const padBottom = 38;

const plotWidth = svgWidth - padLeft - padRight;
const plotHeight = svgHeight - padTop - padBottom;

const chartBounds = computed(() => {
  const pts = chartPoints.value;
  if (pts.length === 0) return { min: 2.5, max: 4.5, range: 2 };
  
  const rawMin = Math.min(...pts.map(p => p.weightKg));
  const rawMax = Math.max(...pts.map(p => p.weightKg));
  
  if (rawMin === rawMax) {
    return {
      min: Math.max(0, parseFloat((rawMin - 0.5).toFixed(3))),
      max: parseFloat((rawMax + 0.5).toFixed(3)),
      range: 1.0
    };
  }

  const padding = (rawMax - rawMin) * 0.15;
  const min = Math.max(0, parseFloat((rawMin - padding).toFixed(3)));
  const max = parseFloat((rawMax + padding).toFixed(3));
  return { min, max, range: max - min };
});

// Y-axis grid lines (3 equidistant lines)
const yGridLines = computed(() => {
  const { min, max } = chartBounds.value;
  const mid = parseFloat(((min + max) / 2).toFixed(2));
  return [
    { value: max.toFixed(2), y: padTop },
    { value: mid.toFixed(2), y: padTop + plotHeight / 2 },
    { value: min.toFixed(2), y: padTop + plotHeight }
  ];
});

// Coordinates for each point on the chart
const computedSvgPoints = computed(() => {
  const pts = chartPoints.value;
  if (pts.length === 0) return [];

  const { min, range } = chartBounds.value;

  return pts.map((pt, i) => {
    const x = pts.length === 1 
      ? padLeft + plotWidth / 2 
      : padLeft + (i / (pts.length - 1)) * plotWidth;

    const normalizedY = range > 0 ? (pt.weightKg - min) / range : 0.5;
    const y = padTop + (1 - normalizedY) * plotHeight;

    return {
      ...pt,
      x,
      y
    };
  });
});

// SVG Smooth Curve Path
const svgPathD = computed(() => {
  const pts = computedSvgPoints.value;
  if (pts.length === 0) return '';
  if (pts.length === 1) return '';

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const midX = (curr.x + next.x) / 2;
    // Cubic bezier curve with control points
    d += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }

  return d;
});

// SVG Area Gradient Path (closes down to baseline)
const svgAreaD = computed(() => {
  const lineD = svgPathD.value;
  const pts = computedSvgPoints.value;
  if (!lineD || pts.length < 2) return '';

  const last = pts[pts.length - 1];
  const first = pts[0];
  const baselineY = padTop + plotHeight;

  return `${lineD} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
});

const hoveredPoint = computed(() => {
  if (activeHoveredPointIndex.value === null) return null;
  return computedSvgPoints.value[activeHoveredPointIndex.value] || null;
});

const confirmDelete = () => {
  if (weightToDelete.value) {
    emit('delete-weight', weightToDelete.value.id);
    weightToDelete.value = null;
  }
};
</script>

<template>
  <div class="space-y-4">
    
    <!-- 1. Top Section: Hero Card with KPIs & Action Button -->
    <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all space-y-4">
      
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-weight-soft flex items-center justify-center text-weight border border-weight-border shadow-soft-xs">
            <Scale class="w-5 h-5" />
          </div>
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-mutedText block">
              Controles de Peso
            </span>
            <h2 class="text-lg font-black text-primaryText leading-tight">
              Seguimiento y Crecimiento
            </h2>
          </div>
        </div>

        <button
          type="button"
          @click="emit('open-create')"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-weight text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-soft-sm"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Registrar Peso</span>
        </button>
      </div>

      <!-- Quick KPI Cards Grid -->
      <div class="grid grid-cols-3 gap-2.5">
        
        <!-- KPI 1: Último peso -->
        <div class="p-3.5 rounded-2xl bg-subtle border border-borderSubtle text-center flex flex-col justify-between">
          <span class="text-[10px] font-bold text-mutedText uppercase tracking-wider block">
            Último Peso
          </span>
          <div class="my-1">
            <span v-if="stats.latestWeightKg" class="text-xl sm:text-2xl font-black font-mono text-primaryText">
              {{ stats.latestWeightKg.toFixed(3) }}<span class="text-xs font-semibold text-mutedText ml-0.5">kg</span>
            </span>
            <span v-else class="text-sm font-bold text-mutedText">
              --
            </span>
          </div>
          <span class="text-[10px] text-mutedText truncate block">
            {{ stats.latestRecordedAt ? formatDate(stats.latestRecordedAt) : 'Sin registros' }}
          </span>
        </div>

        <!-- KPI 2: Ganancia reciente vs anterior -->
        <div class="p-3.5 rounded-2xl bg-subtle border border-borderSubtle text-center flex flex-col justify-between">
          <span class="text-[10px] font-bold text-mutedText uppercase tracking-wider block">
            Cambio Reciente
          </span>
          <div class="my-1 flex items-center justify-center gap-1">
            <template v-if="stats.diffRecentGrams !== null">
              <TrendingUp v-if="stats.diffRecentGrams > 0" class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <TrendingDown v-else-if="stats.diffRecentGrams < 0" class="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <Minus v-else class="w-3.5 h-3.5 text-mutedText flex-shrink-0" />
              
              <span 
                class="text-base sm:text-lg font-black font-mono"
                :class="{
                  'text-emerald-500': stats.diffRecentGrams > 0,
                  'text-rose-500': stats.diffRecentGrams < 0,
                  'text-mutedText': stats.diffRecentGrams === 0
                }"
              >
                {{ stats.diffRecentGrams > 0 ? `+${stats.diffRecentGrams}` : stats.diffRecentGrams }}g
              </span>
            </template>
            <span v-else class="text-sm font-bold text-mutedText">--</span>
          </div>
          <span class="text-[10px] text-mutedText block">
            vs control anterior
          </span>
        </div>

        <!-- KPI 3: Ganancia total desde inicio -->
        <div class="p-3.5 rounded-2xl bg-subtle border border-borderSubtle text-center flex flex-col justify-between">
          <span class="text-[10px] font-bold text-mutedText uppercase tracking-wider block">
            Ganancia Total
          </span>
          <div class="my-1 flex items-center justify-center gap-1">
            <template v-if="stats.diffTotalGrams !== null">
              <Award class="w-3.5 h-3.5 text-weight flex-shrink-0" />
              <span 
                class="text-base sm:text-lg font-black font-mono"
                :class="stats.diffTotalGrams >= 0 ? 'text-weight' : 'text-rose-500'"
              >
                {{ stats.diffTotalGrams > 0 ? `+${stats.diffTotalGrams}` : stats.diffTotalGrams }}g
              </span>
            </template>
            <span v-else class="text-sm font-bold text-mutedText">--</span>
          </div>
          <span class="text-[10px] text-mutedText block">
            {{ stats.firstWeightKg ? `Inicio: ${stats.firstWeightKg.toFixed(3)}kg` : '1er registro' }}
          </span>
        </div>

      </div>

    </section>

    <!-- 2. Interactive Growth Chart (Curva de Crecimiento) -->
    <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all space-y-4">
      
      <!-- Chart Header with Period Selector Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-weight-soft flex items-center justify-center text-weight">
            <TrendingUp class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-primaryText">
              Curva de Crecimiento
            </h3>
            <span class="text-[10px] text-mutedText">
              (Último registro de cada día)
            </span>
          </div>
        </div>

        <!-- Period tabs: Semana, Mes, Año, Todo -->
        <div class="flex items-center bg-subtle p-1 rounded-2xl border border-borderSubtle text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            @click="activePeriod = 'week'"
            class="px-2.5 py-1 rounded-xl transition-all"
            :class="activePeriod === 'week' ? 'bg-surface text-primaryText shadow-soft-xs font-black' : 'text-mutedText hover:text-secondaryText'"
          >
            Semana
          </button>
          <button
            type="button"
            @click="activePeriod = 'month'"
            class="px-2.5 py-1 rounded-xl transition-all"
            :class="activePeriod === 'month' ? 'bg-surface text-primaryText shadow-soft-xs font-black' : 'text-mutedText hover:text-secondaryText'"
          >
            Mes
          </button>
          <button
            type="button"
            @click="activePeriod = 'year'"
            class="px-2.5 py-1 rounded-xl transition-all"
            :class="activePeriod === 'year' ? 'bg-surface text-primaryText shadow-soft-xs font-black' : 'text-mutedText hover:text-secondaryText'"
          >
            Año
          </button>
          <button
            type="button"
            @click="activePeriod = 'all'"
            class="px-2.5 py-1 rounded-xl transition-all"
            :class="activePeriod === 'all' ? 'bg-surface text-primaryText shadow-soft-xs font-black' : 'text-mutedText hover:text-secondaryText'"
          >
            Todos
          </button>
        </div>
      </div>

      <!-- Chart Canvas / Visual Area -->
      <div class="relative bg-subtle/50 rounded-2xl p-2 border border-borderSubtle overflow-hidden">
        
        <!-- Empty State in Chart -->
        <div v-if="chartPoints.length === 0" class="py-12 px-4 text-center space-y-2">
          <Scale class="w-8 h-8 mx-auto text-mutedText opacity-40" />
          <p class="text-xs font-bold text-primaryText">Sin registros de peso aún</p>
          <p class="text-[11px] text-mutedText max-w-xs mx-auto">
            Registrá el peso de tu bebé para visualizar aquí su curva de evolución y percentil.
          </p>
          <button
            type="button"
            @click="emit('open-create')"
            class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-borderSubtle text-xs font-bold text-primaryText hover:bg-subtle active:scale-95 transition-all shadow-sm"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Primer pesaje</span>
          </button>
        </div>

        <!-- Single Point Special Banner -->
        <div 
          v-else-if="chartPoints.length === 1" 
          class="py-6 px-4 text-center space-y-2"
        >
          <div class="w-12 h-12 mx-auto rounded-2xl bg-weight-soft border border-weight-border flex items-center justify-center text-weight">
            <Sparkles class="w-6 h-6" />
          </div>
          <p class="text-xs font-bold text-primaryText">
            Primer peso registrado: <span class="font-mono text-weight">{{ chartPoints[0].weightKg.toFixed(3) }} kg</span>
          </p>
          <p class="text-[11px] text-mutedText max-w-xs mx-auto">
            Registrá un segundo peso para trazar la curva de crecimiento y ver la ganancia de gramos.
          </p>
          <button
            type="button"
            @click="emit('open-create')"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-weight text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Añadir nuevo pesaje</span>
          </button>
        </div>

        <!-- SVG Interactive Line / Spline Chart -->
        <div v-else class="w-full">
          <svg 
            :viewBox="`0 0 ${svgWidth} ${svgHeight}`" 
            class="w-full h-44 sm:h-52 select-none overflow-visible"
            @mouseleave="activeHoveredPointIndex = null"
          >
            <defs>
              <linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--weight-accent)" stop-opacity="0.25" />
                <stop offset="100%" stop-color="var(--weight-accent)" stop-opacity="0.0" />
              </linearGradient>

              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="var(--weight-accent)" flood-opacity="0.3" />
              </filter>
            </defs>

            <!-- Y-Axis Grid Lines & Labels -->
            <g class="opacity-50">
              <line 
                v-for="(grid, idx) in yGridLines" 
                :key="idx"
                :x1="padLeft" 
                :y1="grid.y" 
                :x2="svgWidth - padRight" 
                :y2="grid.y" 
                stroke="currentColor" 
                stroke-dasharray="3 3"
                class="text-borderSubtle stroke-[1]"
              />

              <text 
                v-for="(grid, idx) in yGridLines" 
                :key="'lbl-' + idx"
                :x="padLeft - 6" 
                :y="grid.y + 3" 
                text-anchor="end" 
                class="fill-mutedText text-[9px] font-mono font-bold"
              >
                {{ grid.value }}k
              </text>
            </g>

            <!-- Area Fill -->
            <path 
              :d="svgAreaD" 
              fill="url(#weightAreaGradient)" 
            />

            <!-- Curve Line -->
            <path 
              :d="svgPathD" 
              fill="none" 
              stroke="var(--weight-accent)" 
              stroke-width="3" 
              stroke-linecap="round"
              stroke-linejoin="round"
              filter="url(#glow)"
            />

            <!-- Interactive Dots & Target Hit Areas -->
            <g v-for="(pt, idx) in computedSvgPoints" :key="pt.id">
              
              <!-- Vertical Guide Line on Hover -->
              <line
                v-if="activeHoveredPointIndex === idx"
                :x1="pt.x"
                :y1="padTop"
                :x2="pt.x"
                :y2="padTop + plotHeight"
                stroke="var(--weight-accent)"
                stroke-width="1.5"
                stroke-dasharray="2 2"
                class="opacity-75"
              />

              <!-- Outer Dot Pulse / Halo -->
              <circle
                :cx="pt.x"
                :cy="pt.y"
                :r="activeHoveredPointIndex === idx ? 7 : 4"
                fill="var(--bg-surface)"
                stroke="var(--weight-accent)"
                :stroke-width="activeHoveredPointIndex === idx ? 3 : 2"
                class="transition-all duration-150 cursor-pointer"
              />

              <!-- Center Dot Core -->
              <circle
                :cx="pt.x"
                :cy="pt.y"
                :r="activeHoveredPointIndex === idx ? 3 : 1.5"
                fill="var(--weight-accent)"
                class="pointer-events-none"
              />

              <!-- Date Label below (show only on sparse points or extremes) -->
              <text
                v-if="computedSvgPoints.length <= 8 || idx === 0 || idx === computedSvgPoints.length - 1 || idx % Math.ceil(computedSvgPoints.length / 5) === 0"
                :x="pt.x"
                :y="padTop + plotHeight + 16"
                text-anchor="middle"
                class="fill-mutedText text-[9px] font-bold"
                :class="activeHoveredPointIndex === idx ? 'fill-primaryText font-black' : ''"
              >
                {{ pt.dateLabel }}
              </text>

              <!-- Invisible Large Hitbox for touch / hover -->
              <rect
                :x="pt.x - 18"
                :y="padTop - 10"
                width="36"
                :height="plotHeight + 30"
                fill="transparent"
                class="cursor-pointer"
                @mouseenter="activeHoveredPointIndex = idx"
                @touchstart.passive="activeHoveredPointIndex = idx"
              />
            </g>
          </svg>

          <!-- Floating Tooltip Box -->
          <div 
            v-if="hoveredPoint"
            class="mt-2 p-2.5 rounded-xl bg-surface border border-borderSubtle shadow-soft-sm flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150"
          >
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-weight-soft flex items-center justify-center text-weight flex-shrink-0">
                <Scale class="w-3.5 h-3.5" />
              </div>
              <div>
                <span class="font-black text-primaryText font-mono text-sm block leading-none">
                  {{ hoveredPoint.weightKg.toFixed(3) }} kg
                  <span class="text-[10px] text-mutedText font-normal font-sans ml-1">({{ hoveredPoint.weightGrams }} g)</span>
                </span>
                <span class="text-[10px] text-mutedText block mt-0.5">
                  {{ hoveredPoint.fullDateLabel }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 text-right">
              <div v-if="hoveredPoint.diffFromPrevGrams !== null">
                <span 
                  class="font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg inline-block"
                  :class="hoveredPoint.diffFromPrevGrams >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'"
                >
                  {{ hoveredPoint.diffFromPrevGrams >= 0 ? `+${hoveredPoint.diffFromPrevGrams}` : hoveredPoint.diffFromPrevGrams }}g
                </span>
              </div>
              <span v-if="hoveredPoint.notes" class="text-[10px] text-secondaryText italic max-w-[120px] truncate" :title="hoveredPoint.notes">
                "{{ hoveredPoint.notes }}"
              </span>
            </div>
          </div>

          <div v-else class="text-[10px] text-center text-mutedText pt-1">
            Toca cualquier punto del gráfico para ver los detalles y ganancia
          </div>

        </div>

      </div>

    </section>

    <!-- 3. Bottom Section: Chronological Decreasing History List -->
    <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all space-y-4">
      
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-subtle flex items-center justify-center text-primaryText">
            <Calendar class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-mutedText">
              Historial de Pesajes
            </h3>
            <span class="text-[10px] text-mutedText">
              Orden decreciente ({{ weights.length }} registros)
            </span>
          </div>
        </div>

        <button
          type="button"
          @click="emit('open-create')"
          class="p-1.5 rounded-full bg-subtle hover:bg-borderSubtle text-secondaryText hover:text-primaryText transition-colors"
          title="Añadir pesaje"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="weights.length === 0" class="py-8 px-4 text-center rounded-2xl bg-subtle/50 border border-dashed border-borderSubtle">
        <Scale class="w-7 h-7 mx-auto text-mutedText opacity-40 mb-1.5" />
        <p class="text-xs font-bold text-primaryText">No hay pesajes registrados</p>
        <p class="text-[11px] text-mutedText mt-0.5">
          Tocá en "Registrar Peso" para añadir el primer control del bebé.
        </p>
      </div>

      <!-- Decreasing List of Weigh-ins -->
      <div v-else class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        
        <div
          v-for="(w, idx) in weights"
          :key="w.id"
          class="p-3.5 rounded-2xl bg-subtle border border-borderSubtle flex items-start justify-between gap-3 hover:border-weight/30 transition-all"
        >
          <!-- Left info -->
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="w-9 h-9 rounded-xl bg-weight-soft border border-weight-border flex items-center justify-center text-weight flex-shrink-0 mt-0.5">
              <Scale class="w-4 h-4" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-base font-black font-mono text-primaryText leading-none">
                  {{ Number(w.weight_kg).toFixed(3) }} <span class="text-xs font-bold text-mutedText font-sans">kg</span>
                </span>

                <!-- Grams conversion & Delta badge -->
                <span class="text-[11px] font-mono font-medium text-mutedText">
                  ({{ Math.round(Number(w.weight_kg) * 1000) }} g)
                </span>

                <!-- Delta Badge vs next older weigh-in -->
                <template v-if="getWeightDeltaFromNext(idx) !== null">
                  <span
                    class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
                    :class="{
                      'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20': getWeightDeltaFromNext(idx)! > 0,
                      'bg-rose-500/10 text-rose-600 border border-rose-500/20': getWeightDeltaFromNext(idx)! < 0,
                      'bg-subtle text-mutedText border border-borderSubtle': getWeightDeltaFromNext(idx)! === 0
                    }"
                  >
                    <TrendingUp v-if="getWeightDeltaFromNext(idx)! > 0" class="w-2.5 h-2.5" />
                    <TrendingDown v-else-if="getWeightDeltaFromNext(idx)! < 0" class="w-2.5 h-2.5" />
                    <span>{{ getWeightDeltaFromNext(idx)! > 0 ? `+${getWeightDeltaFromNext(idx)}` : getWeightDeltaFromNext(idx) }}g</span>
                  </span>
                </template>
              </div>

              <!-- Date and Time -->
              <div class="flex items-center gap-2 text-[11px] text-mutedText mt-1">
                <span class="font-medium text-secondaryText">{{ formatDate(w.recorded_at) }}</span>
                <span>•</span>
                <span class="font-mono">{{ formatTime(w.recorded_at) }}</span>
              </div>

              <!-- Optional Description Note Bubble (e.g. "Pesado en el hospital por el pediatra") -->
              <div 
                v-if="w.notes" 
                class="mt-2 text-[11px] text-secondaryText bg-surface/90 px-3 py-1.5 rounded-xl border border-borderSubtle flex items-start gap-1.5"
              >
                <MessageSquare class="w-3.5 h-3.5 text-weight flex-shrink-0 mt-0.5" />
                <span class="leading-relaxed font-medium">"{{ w.notes }}"</span>
              </div>
            </div>
          </div>

          <!-- Actions: Edit and Delete Buttons -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              @click="emit('open-edit', w)"
              class="p-2 text-mutedText hover:text-primaryText rounded-xl hover:bg-surface transition-colors"
              title="Editar registro"
            >
              <Edit3 class="w-4 h-4" />
            </button>

            <button
              type="button"
              @click="weightToDelete = w"
              class="p-2 text-mutedText hover:text-rose-500 rounded-xl hover:bg-surface transition-colors"
              title="Eliminar registro"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </section>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="weightToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      @click.self="weightToDelete = null"
    >
      <div class="w-full max-w-xs bg-surface rounded-3xl border border-borderSubtle p-6 shadow-soft-lg space-y-4 text-center animate-in zoom-in-95 duration-150">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
          <Trash2 class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-extrabold text-primaryText">¿Eliminar registro?</h3>
          <p class="text-xs text-mutedText leading-relaxed">
            Se eliminará el peso de <span class="font-bold text-primaryText font-mono">{{ Number(weightToDelete.weight_kg).toFixed(3) }} kg</span> del {{ formatDate(weightToDelete.recorded_at) }}.
          </p>
        </div>
        <div class="flex gap-2.5 pt-2">
          <button
            type="button"
            @click="weightToDelete = null"
            class="flex-1 py-2.5 rounded-2xl bg-subtle text-secondaryText font-bold text-xs hover:bg-borderSubtle transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isLoading"
            @click="confirmDelete"
            class="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-soft-sm transition-all"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
