<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  BarChart2, 
  Clock, 
  Trash2, 
  Calendar, 
  Moon, 
  Baby, 
  MessageSquare, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-vue-next';
import type { 
  Feeding, 
  FeedingStatsSummary, 
  SleepLog, 
  SleepStatsSummary,
  TimeframePeriod,
  PeriodSleepStatsSummary 
} from '~/types/baby-tracker';
import { getSleepSecondsForDate, getLocalDateStr } from '~/composables/useSleepTracker';

const props = withDefaults(defineProps<{
  stats: FeedingStatsSummary;
  feedings: Feeding[];
  sleepStats: SleepStatsSummary;
  sleepLogs: SleepLog[];
  selectedPeriod?: TimeframePeriod;
  selectedDate?: string;
  periodSleepStats?: PeriodSleepStatsSummary;
  isLoading?: boolean;
}>(), {
  selectedPeriod: 'day',
  selectedDate: () => getLocalDateStr()
});

const emit = defineEmits<{
  (e: 'delete-feeding', id: string): void;
  (e: 'delete-sleep', id: string): void;
  (e: 'update:period', period: TimeframePeriod): void;
  (e: 'update:date', date: string): void;
  (e: 'navigate-date', step: number): void;
  (e: 'go-today'): void;
}>();

const activeHistoryFilter = ref<'all' | 'feedings' | 'sleep'>('all');
const showAllHistory = ref<boolean>(false);

const todayStr = computed(() => getLocalDateStr());

const isCurrentPeriodToday = computed(() => {
  if (props.selectedPeriod === 'day') {
    return props.selectedDate === todayStr.value;
  }
  if (props.selectedPeriod === 'week') {
    // Check if today is inside the current week breakdown
    return props.periodSleepStats?.dailyBreakdown.some(d => d.date === todayStr.value) ?? false;
  }
  if (props.selectedPeriod === 'month') {
    return props.selectedDate.slice(0, 7) === todayStr.value.slice(0, 7);
  }
  return false;
});

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`;
  if (m === 0) return `${s}s`;
  return `${m}m ${s > 0 ? `${s}s` : ''}`;
};

const formatTime = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

// Max hours decimal in breakdown for chart scaling
const maxChartHours = computed(() => {
  if (!props.periodSleepStats || props.periodSleepStats.dailyBreakdown.length === 0) return 16;
  const max = Math.max(...props.periodSleepStats.dailyBreakdown.map(d => d.totalHoursDecimal), 12);
  return Math.ceil(max);
});

// Unified Chronological Activity History
interface UnifiedActivity {
  id: string;
  type: 'feeding' | 'sleep';
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_duration_seconds?: number;
  crosses_midnight?: boolean;
  split_badge?: string;
  title: string;
  notes?: string | null;
  breast_side?: string | null;
}

const combinedHistory = computed<UnifiedActivity[]>(() => {
  const items: UnifiedActivity[] = [];

  // Determine allowed date strings based on selected period
  const allowedDates = new Set<string>();
  if (props.periodSleepStats?.dailyBreakdown && !showAllHistory.value) {
    props.periodSleepStats.dailyBreakdown.forEach(d => allowedDates.add(d.date));
  }

  if (activeHistoryFilter.value === 'all' || activeHistoryFilter.value === 'feedings') {
    props.feedings.forEach(f => {
      const fLocalDate = getLocalDateStr(f.started_at);
      if (showAllHistory.value || allowedDates.has(fLocalDate) || fLocalDate === props.selectedDate) {
        const notes = f.notes || '';
        let title = 'Lactancia';

        if (notes.includes('Combinada')) {
          title = 'Toma Combinada';
        } else if (f.feeding_type === 'bottle' || (f.amount_ml && f.amount_ml > 0)) {
          if (notes.includes('Materna')) {
            title = `Bib. Leche Materna (${f.amount_ml || 0} ml)`;
          } else {
            title = `Bib. Fórmula (${f.amount_ml || 0} ml)`;
          }
        } else if (f.breast_side === 'left') {
          title = 'Pecho Izquierdo';
        } else if (f.breast_side === 'right') {
          title = 'Pecho Derecho';
        } else if (f.breast_side === 'both') {
          title = 'Ambos Pechos (I + D)';
        }

        items.push({
          id: f.id,
          type: 'feeding',
          started_at: f.started_at,
          ended_at: f.ended_at,
          duration_seconds: f.duration_seconds,
          title,
          notes: f.notes,
          breast_side: f.breast_side
        });
      }
    });
  }

  if (activeHistoryFilter.value === 'all' || activeHistoryFilter.value === 'sleep') {
    props.sleepLogs.forEach(s => {
      const startLocalDate = getLocalDateStr(s.started_at);
      const endLocalDate = s.ended_at ? getLocalDateStr(s.ended_at) : startLocalDate;
      const crossesMidnight = startLocalDate !== endLocalDate;

      if (showAllHistory.value) {
        items.push({
          id: s.id,
          type: 'sleep',
          started_at: s.started_at,
          ended_at: s.ended_at,
          duration_seconds: s.duration_seconds,
          total_duration_seconds: s.duration_seconds,
          crosses_midnight: crossesMidnight,
          title: 'Sueño / Siesta',
          notes: s.notes
        });
        return;
      }

      if (props.selectedPeriod === 'day') {
        const targetD = props.selectedDate;
        const daySeconds = getSleepSecondsForDate(s, targetD);
        if (daySeconds > 0) {
          const isSplitSlice = daySeconds < s.duration_seconds;
          items.push({
            id: s.id,
            type: 'sleep',
            started_at: s.started_at,
            ended_at: s.ended_at,
            duration_seconds: daySeconds,
            total_duration_seconds: s.duration_seconds,
            crosses_midnight: crossesMidnight || isSplitSlice,
            split_badge: isSplitSlice
              ? `${formatDuration(daySeconds)} este día (de ${formatDuration(s.duration_seconds)} totales • cruza 00:00)`
              : undefined,
            title: 'Sueño / Siesta',
            notes: s.notes
          });
        }
      } else {
        const datesList = allowedDates.size > 0 ? Array.from(allowedDates) : [props.selectedDate];
        const periodSeconds = datesList.reduce((acc, d) => acc + getSleepSecondsForDate(s, d), 0);
        if (periodSeconds > 0) {
          const isSplitSlice = periodSeconds < s.duration_seconds;
          items.push({
            id: s.id,
            type: 'sleep',
            started_at: s.started_at,
            ended_at: s.ended_at,
            duration_seconds: periodSeconds,
            total_duration_seconds: s.duration_seconds,
            crosses_midnight: crossesMidnight || isSplitSlice,
            split_badge: isSplitSlice
              ? `${formatDuration(periodSeconds)} en este periodo (de ${formatDuration(s.duration_seconds)} totales)`
              : undefined,
            title: 'Sueño / Siesta',
            notes: s.notes
          });
        }
      }
    });
  }

  return items.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
});
</script>

<template>
  <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all space-y-6">
    
    <!-- 0. Timeframe Range Selector Tabs & Date Navigation -->
    <div class="space-y-3">
      <!-- Period Tabs (Día / Semana / Mes) -->
      <div class="flex items-center bg-subtle p-1 rounded-2xl border border-borderSubtle">
        <button
          type="button"
          @click="emit('update:period', 'day')"
          class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          :class="selectedPeriod === 'day' ? 'bg-surface text-primaryText shadow-soft-xs' : 'text-mutedText hover:text-secondaryText'"
        >
          <Calendar class="w-3.5 h-3.5" />
          <span>Día</span>
        </button>

        <button
          type="button"
          @click="emit('update:period', 'week')"
          class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          :class="selectedPeriod === 'week' ? 'bg-surface text-primaryText shadow-soft-xs' : 'text-mutedText hover:text-secondaryText'"
        >
          <BarChart2 class="w-3.5 h-3.5" />
          <span>Semana</span>
        </button>

        <button
          type="button"
          @click="emit('update:period', 'month')"
          class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          :class="selectedPeriod === 'month' ? 'bg-surface text-primaryText shadow-soft-xs' : 'text-mutedText hover:text-secondaryText'"
        >
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Mes</span>
        </button>
      </div>

      <!-- Navigation Header for Selected Period -->
      <div class="flex items-center justify-between bg-subtle p-2 rounded-2xl border border-borderSubtle">
        <button
          type="button"
          @click="emit('navigate-date', -1)"
          class="p-2 rounded-xl bg-surface hover:bg-borderSubtle text-primaryText transition-all active:scale-95 border border-borderSubtle/60 shadow-xs"
          :title="selectedPeriod === 'day' ? 'Día anterior' : selectedPeriod === 'week' ? 'Semana anterior' : 'Mes anterior'"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="relative flex items-center gap-1.5 cursor-pointer text-center">
          <span class="text-xs font-extrabold text-primaryText capitalize">
            {{ periodSleepStats?.periodLabel || selectedDate }}
          </span>
          <input 
            v-if="selectedPeriod === 'day'"
            type="date"
            :value="selectedDate"
            :max="todayStr"
            @change="emit('update:date', ($event.target as HTMLInputElement).value)"
            class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Elegir fecha específica"
          />
        </div>

        <div class="flex items-center gap-1">
          <button
            v-if="!isCurrentPeriodToday"
            type="button"
            @click="emit('go-today')"
            class="px-2 py-1 rounded-xl bg-bottle-soft hover:bg-bottle-border text-bottle font-bold text-[10px] transition-all flex items-center gap-1 border border-bottle-border"
            title="Volver a la fecha actual"
          >
            <RotateCcw class="w-3 h-3" />
            <span>{{ selectedPeriod === 'day' ? 'Hoy' : selectedPeriod === 'week' ? 'Esta semana' : 'Este mes' }}</span>
          </button>

          <button
            type="button"
            :disabled="isCurrentPeriodToday"
            @click="emit('navigate-date', 1)"
            class="p-2 rounded-xl bg-surface hover:bg-borderSubtle text-primaryText transition-all active:scale-95 border border-borderSubtle/60 shadow-xs disabled:opacity-30 disabled:pointer-events-none"
            :title="selectedPeriod === 'day' ? 'Día siguiente' : selectedPeriod === 'week' ? 'Semana siguiente' : 'Mes siguiente'"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 1. Sleep Metrics Section (Temporal & Advanced) -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-bottle-soft flex items-center justify-center text-bottle">
            <Moon class="w-4 h-4" />
          </div>
          <h2 class="text-xs font-bold uppercase tracking-wider text-mutedText">
            Métricas de Sueño ({{ selectedPeriod === 'day' ? 'Diarias' : selectedPeriod === 'week' ? 'Semanales' : 'Mensuales' }})
          </h2>
        </div>

        <span class="text-[11px] font-bold text-bottle bg-bottle-soft px-2 py-0.5 rounded-full border border-bottle-border">
          {{ periodSleepStats?.totalSleepFormatted || '0m' }} total
        </span>
      </div>

      <!-- KPI Summary Cards Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">
            {{ selectedPeriod === 'day' ? 'Total Sueño' : 'Media / Día' }}
          </span>
          <span class="text-base font-black text-primaryText font-mono mt-0.5 block truncate">
            {{ selectedPeriod === 'day' ? (periodSleepStats?.totalSleepFormatted || '0m') : `${periodSleepStats?.dailyAvgSleepFormatted || '0m'}` }}
          </span>
        </div>

        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">
            {{ selectedPeriod === 'day' ? 'Siestas' : 'Total Siestas' }}
          </span>
          <span class="text-base font-black text-primaryText font-mono mt-0.5 block">
            {{ periodSleepStats?.napCount || 0 }}
            <span v-if="selectedPeriod !== 'day'" class="text-[10px] text-mutedText font-normal">
              ({{ periodSleepStats?.dailyAvgNaps }}/d)
            </span>
          </span>
        </div>

        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Media Siesta</span>
          <span class="text-base font-black text-primaryText font-mono mt-0.5 block">
            {{ periodSleepStats?.avgNapMinutes || 0 }}<span class="text-xs font-normal text-mutedText ml-0.5">min</span>
          </span>
        </div>

        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Más Larga</span>
          <span class="text-base font-black text-primaryText font-mono mt-0.5 block">
            {{ periodSleepStats?.longestNapMinutes || 0 }}<span class="text-xs font-normal text-mutedText ml-0.5">min</span>
          </span>
        </div>
      </div>

      <!-- Visual Sleep Distribution Chart (for Week and Month) -->
      <div 
        v-if="selectedPeriod !== 'day' && periodSleepStats && periodSleepStats.dailyBreakdown.length > 0"
        class="p-4 rounded-2xl bg-subtle border border-borderSubtle space-y-3"
      >
        <div class="flex items-center justify-between text-xs font-bold text-primaryText">
          <span class="flex items-center gap-1.5">
            <BarChart2 class="w-3.5 h-3.5 text-bottle" />
            <span>Distribución de Horas de Sueño</span>
          </span>
          <span class="text-[10px] text-mutedText font-mono">
            Objetivo: ~14h / día
          </span>
        </div>

        <!-- Weekly 7-Day Chart -->
        <div v-if="selectedPeriod === 'week'" class="pt-3 pb-1 flex items-end justify-between gap-2 h-36">
          <div 
            v-for="day in periodSleepStats.dailyBreakdown" 
            :key="day.date"
            class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
            :title="`${day.dayLabel}: ${day.totalSleepFormatted} (${day.napCount} siestas)`"
            @click="emit('update:period', 'day'); emit('update:date', day.date)"
          >
            <!-- Value on top of bar -->
            <span class="text-[9px] font-bold font-mono text-mutedText mb-1 group-hover:text-primaryText transition-colors">
              {{ day.totalHoursDecimal > 0 ? `${day.totalHoursDecimal}h` : '0' }}
            </span>

            <!-- Vertical bar -->
            <div class="w-full max-w-[28px] bg-borderSubtle rounded-t-xl overflow-hidden flex flex-col justify-end h-24 relative transition-all group-hover:ring-2 group-hover:ring-bottle/40">
              <div 
                class="w-full rounded-t-xl transition-all duration-500"
                :class="day.isTargetDay || day.date === todayStr ? 'bg-bottle shadow-sm' : 'bg-bottle/60 group-hover:bg-bottle'"
                :style="{ height: `${Math.min(100, Math.max(8, (day.totalHoursDecimal / maxChartHours) * 100))}%` }"
              />
            </div>

            <!-- Day Label below bar -->
            <span 
              class="text-[10px] font-bold mt-1.5 transition-colors"
              :class="day.isTargetDay || day.date === todayStr ? 'text-bottle' : 'text-mutedText'"
            >
              {{ day.dayShort }}
            </span>
          </div>
        </div>

        <!-- Monthly 30-Day Sparkline / Bar Grid -->
        <div v-else-if="selectedPeriod === 'month'" class="pt-2 pb-1 space-y-2">
          <div class="flex items-end justify-between gap-1 h-28">
            <div 
              v-for="day in periodSleepStats.dailyBreakdown" 
              :key="day.date"
              class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              :title="`Día ${day.dayLabel}: ${day.totalSleepFormatted}`"
              @click="emit('update:period', 'day'); emit('update:date', day.date)"
            >
              <div class="w-full bg-borderSubtle rounded-t-sm overflow-hidden flex flex-col justify-end h-20 relative">
                <div 
                  class="w-full rounded-t-sm transition-all duration-300"
                  :class="day.date === todayStr ? 'bg-bottle' : 'bg-bottle/60 group-hover:bg-bottle'"
                  :style="{ height: `${Math.min(100, Math.max(6, (day.totalHoursDecimal / maxChartHours) * 100))}%` }"
                />
              </div>
              <span class="text-[8px] text-mutedText mt-1 scale-90">
                {{ Number(day.dayShort) % 5 === 0 || Number(day.dayShort) === 1 ? day.dayShort : '' }}
              </span>
            </div>
          </div>
          <p class="text-[10px] text-center text-mutedText">
            Toca cualquier día para ver sus métricas detalladas
          </p>
        </div>

      </div>
    </div>

    <!-- 2. Feeding Metrics Section -->
    <div class="pt-2 border-t border-borderSubtle space-y-3">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-breastLeft-soft flex items-center justify-center text-breastLeft">
            <Baby class="w-4 h-4" />
          </div>
          <h2 class="text-xs font-bold uppercase tracking-wider text-mutedText">Métricas de Lactancia (Hoy)</h2>
        </div>
        <span v-if="stats.mixedCount > 0" class="text-[10px] font-bold text-warningSoft bg-warningSoft-soft px-2 py-0.5 rounded-full border border-warningSoft-border">
          {{ stats.mixedCount }} combinadas
        </span>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Tomas</span>
          <span class="text-lg font-extrabold text-primaryText font-mono mt-0.5 block">
            {{ stats.totalFeedingsToday }}
          </span>
        </div>

        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Duración Media</span>
          <span class="text-lg font-extrabold text-primaryText font-mono mt-0.5 block">
            {{ stats.avgDurationMinutes }}<span class="text-xs font-normal text-mutedText ml-0.5">m</span>
          </span>
        </div>

        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Descanso Medio</span>
          <span class="text-lg font-extrabold text-primaryText font-mono mt-0.5 block">
            {{ stats.avgRestIntervalMinutes }}<span class="text-xs font-normal text-mutedText ml-0.5">m</span>
          </span>
        </div>
      </div>

      <!-- 4-Way Balance Bar (Left Breast, Right Breast, Maternal Bottle, Formula Bottle) -->
      <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle">
        <div class="flex items-center justify-between text-xs font-semibold text-mutedText mb-1.5">
          <span>Balance de Formatos</span>
        </div>
        <div class="h-2.5 w-full bg-borderSubtle rounded-full overflow-hidden flex">
          <div class="h-full bg-breastLeft transition-all duration-500" :style="{ width: `${stats.leftPercentage}%` }" title="Pecho Izquierdo" />
          <div class="h-full bg-breastRight transition-all duration-500" :style="{ width: `${stats.rightPercentage}%` }" title="Pecho Derecho" />
          <div v-if="stats.bottleMaternalPercentage > 0" class="h-full bg-bottle transition-all duration-500" :style="{ width: `${stats.bottleMaternalPercentage}%` }" title="Biberón Leche Materna" />
          <div v-if="stats.bottleFormulaPercentage > 0" class="h-full bg-warningSoft transition-all duration-500" :style="{ width: `${stats.bottleFormulaPercentage}%` }" title="Biberón Fórmula" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-2 text-[10px] font-semibold">
          <span class="text-breastLeft flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-breastLeft inline-block" /> Izq: {{ stats.leftPercentage }}%
          </span>
          <span class="text-breastRight flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-breastRight inline-block" /> Der: {{ stats.rightPercentage }}%
          </span>
          <span class="text-bottle flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-bottle inline-block" /> Mat: {{ stats.bottleMaternalPercentage }}%
          </span>
          <span class="text-warningSoft flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-warningSoft inline-block" /> Fórm: {{ stats.bottleFormulaPercentage }}%
          </span>
        </div>
      </div>
    </div>


    <!-- 3. Unified Chronological Activity History with Filter -->
    <div class="pt-2 border-t border-borderSubtle space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wider text-mutedText flex items-center gap-1.5">
          <Calendar class="w-3.5 h-3.5" />
          <span>Historial de Actividad</span>
        </h3>

        <!-- Filter tabs -->
        <div class="flex items-center bg-subtle p-0.5 rounded-xl border border-borderSubtle text-[10px] font-bold">
          <button
            type="button"
            @click="activeHistoryFilter = 'all'"
            class="px-2 py-1 rounded-lg transition-all"
            :class="activeHistoryFilter === 'all' ? 'bg-surface text-primaryText shadow-sm' : 'text-mutedText'"
          >
            Todo
          </button>
          <button
            type="button"
            @click="activeHistoryFilter = 'feedings'"
            class="px-2 py-1 rounded-lg transition-all"
            :class="activeHistoryFilter === 'feedings' ? 'bg-surface text-primaryText shadow-sm' : 'text-mutedText'"
          >
            Tomas
          </button>
          <button
            type="button"
            @click="activeHistoryFilter = 'sleep'"
            class="px-2 py-1 rounded-lg transition-all"
            :class="activeHistoryFilter === 'sleep' ? 'bg-surface text-primaryText shadow-sm' : 'text-mutedText'"
          >
            Sueño
          </button>
        </div>
      </div>

      <div v-if="combinedHistory.length === 0" class="py-6 text-center text-xs text-mutedText">
        No hay actividades registradas en este periodo.
      </div>

      <div v-else class="space-y-2 max-h-80 overflow-y-auto pr-1">
        <div 
          v-for="item in combinedHistory" 
          :key="item.id"
          class="p-3 rounded-2xl bg-subtle border border-borderSubtle flex items-start justify-between gap-2"
        >
          <!-- Left Icon & Details -->
          <div class="flex items-start gap-2.5 min-w-0 flex-1">
            <div 
              class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              :class="item.type === 'sleep' ? 'bg-bottle-soft text-bottle' : 'bg-breastLeft-soft text-breastLeft'"
            >
              <Moon v-if="item.type === 'sleep'" class="w-3.5 h-3.5" />
              <Baby v-else class="w-3.5 h-3.5" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-primaryText truncate flex items-center gap-1.5">
                <span>{{ item.title }}</span>
                <span class="text-[10px] font-semibold text-mutedText font-mono">
                  ({{ formatDuration(item.duration_seconds) }})
                </span>
              </div>

              <div class="text-[11px] text-mutedText mt-0.5">
                <template v-if="item.crosses_midnight">
                  {{ formatDate(item.started_at) }} {{ formatTime(item.started_at) }} → {{ formatDate(item.ended_at) }} {{ formatTime(item.ended_at) }}
                </template>
                <template v-else>
                  {{ formatDate(item.started_at) }} • {{ formatTime(item.started_at) }} - {{ formatTime(item.ended_at) }}
                </template>
              </div>

              <div
                v-if="item.split_badge"
                class="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-bottle bg-bottle-soft/60 px-2 py-0.5 rounded-md border border-bottle-border/60"
              >
                <Moon class="w-2.5 h-2.5 flex-shrink-0" />
                <span>{{ item.split_badge }}</span>
              </div>

              <!-- Notes / Comments Bubble -->
              <div 
                v-if="item.notes" 
                class="mt-1.5 text-[11px] text-secondaryText bg-surface/80 px-2.5 py-1 rounded-lg border border-borderSubtle/60 flex items-center gap-1.5"
              >
                <MessageSquare class="w-3 h-3 text-mutedText flex-shrink-0" />
                <span class="truncate italic">"{{ item.notes }}"</span>
              </div>
            </div>
          </div>

          <!-- Delete action -->
          <button 
            type="button" 
            @click="item.type === 'sleep' ? emit('delete-sleep', item.id) : emit('delete-feeding', item.id)"
            class="p-1.5 text-mutedText hover:text-red-500 rounded-lg hover:bg-surface transition-colors flex-shrink-0"
            title="Eliminar registro"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

  </section>
</template>

