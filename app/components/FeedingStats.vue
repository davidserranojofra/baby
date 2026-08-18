<script setup lang="ts">
import { ref, computed } from 'vue';
import { BarChart2, Clock, Trash2, Calendar, Moon, Baby, MessageSquare, Filter } from 'lucide-vue-next';
import type { Feeding, FeedingStatsSummary, SleepLog, SleepStatsSummary } from '~/types/baby-tracker';

const props = defineProps<{
  stats: FeedingStatsSummary;
  feedings: Feeding[];
  sleepStats: SleepStatsSummary;
  sleepLogs: SleepLog[];
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'delete-feeding', id: string): void;
  (e: 'delete-sleep', id: string): void;
}>();

const activeHistoryFilter = ref<'all' | 'feedings' | 'sleep'>('all');

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

// Unified Chronological Activity History
interface UnifiedActivity {
  id: string;
  type: 'feeding' | 'sleep';
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  title: string;
  notes?: string | null;
  breast_side?: string | null;
}

const combinedHistory = computed<UnifiedActivity[]>(() => {
  const items: UnifiedActivity[] = [];

  if (activeHistoryFilter.value === 'all' || activeHistoryFilter.value === 'feedings') {
    props.feedings.forEach(f => {
      let title = 'Lactancia';
      if (f.feeding_type === 'bottle') {
        title = `Biberón (${f.amount_ml || 0} ml)`;
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
    });
  }

  if (activeHistoryFilter.value === 'all' || activeHistoryFilter.value === 'sleep') {
    props.sleepLogs.forEach(s => {
      items.push({
        id: s.id,
        type: 'sleep',
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: s.duration_seconds,
        title: 'Sueño / Siesta',
        notes: s.notes
      });
    });
  }

  return items.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
});
</script>

<template>
  <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all space-y-6">
    
    <!-- 1. Feeding Metrics Section -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <div class="w-7 h-7 rounded-lg bg-breastLeft-soft flex items-center justify-center text-breastLeft">
          <Baby class="w-4 h-4" />
        </div>
        <h2 class="text-xs font-bold uppercase tracking-wider text-mutedText">Métricas de Lactancia (Hoy)</h2>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-3">
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

      <!-- Balance Bar -->
      <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle">
        <div class="flex items-center justify-between text-xs font-semibold text-mutedText mb-1.5">
          <span>Balance de Pecho / Biberón</span>
        </div>
        <div class="h-2.5 w-full bg-borderSubtle rounded-full overflow-hidden flex">
          <div class="h-full bg-breastLeft transition-all duration-500" :style="{ width: `${stats.leftPercentage}%` }" />
          <div class="h-full bg-breastRight transition-all duration-500" :style="{ width: `${stats.rightPercentage}%` }" />
          <div v-if="stats.bottlePercentage > 0" class="h-full bg-bottle transition-all duration-500" :style="{ width: `${stats.bottlePercentage}%` }" />
        </div>
        <div class="flex items-center justify-between mt-1.5 text-[10px] font-medium">
          <span class="text-breastLeft">Izq: {{ stats.leftPercentage }}%</span>
          <span class="text-breastRight">Der: {{ stats.rightPercentage }}%</span>
          <span v-if="stats.bottlePercentage > 0" class="text-bottle">Bib: {{ stats.bottlePercentage }}%</span>
        </div>
      </div>
    </div>

    <!-- 2. Sleep Metrics Section -->
    <div class="pt-2 border-t border-borderSubtle">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-7 h-7 rounded-lg bg-bottle-soft flex items-center justify-center text-bottle">
          <Moon class="w-4 h-4" />
        </div>
        <h2 class="text-xs font-bold uppercase tracking-wider text-mutedText">Métricas de Sueño (Hoy)</h2>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Total Sueño</span>
          <span class="text-lg font-extrabold text-primaryText font-mono mt-0.5 block">
            {{ sleepStats.totalSleepFormatted }}
          </span>
        </div>

        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Siestas</span>
          <span class="text-lg font-extrabold text-primaryText font-mono mt-0.5 block">
            {{ sleepStats.napCountToday }}
          </span>
        </div>

        <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
          <span class="block text-[10px] font-semibold text-mutedText uppercase">Media Siesta</span>
          <span class="text-lg font-extrabold text-primaryText font-mono mt-0.5 block">
            {{ sleepStats.avgNapMinutesToday }}<span class="text-xs font-normal text-mutedText ml-0.5">m</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 3. Unified Chronological Activity History with Filter -->
    <div class="pt-2 border-t border-borderSubtle">
      <div class="flex items-center justify-between mb-3">
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
        No hay actividades registradas con el filtro actual.
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
                {{ formatDate(item.started_at) }} • {{ formatTime(item.started_at) }} - {{ formatTime(item.ended_at) }}
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
