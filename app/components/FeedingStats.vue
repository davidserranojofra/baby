<script setup lang="ts">
import { ref } from 'vue';
import { BarChart2, Clock, Trash2, Calendar, ChevronRight } from 'lucide-vue-next';
import type { Feeding, FeedingStatsSummary } from '~/types/baby-tracker';

const props = defineProps<{
  stats: FeedingStatsSummary;
  feedings: Feeding[];
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'delete-feeding', id: string): void;
}>();

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
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
</script>

<template>
  <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-primaryText">
          <BarChart2 class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-mutedText">Estadísticas y Resumen</h2>
          <p class="text-sm font-bold text-primaryText">Hoy</p>
        </div>
      </div>
    </div>

    <!-- 3 Metrics KPI Cards -->
    <div class="grid grid-cols-3 gap-2.5 mb-5">
      <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
        <span class="block text-[10px] font-semibold text-mutedText uppercase">Tomas Hoy</span>
        <span class="text-xl font-extrabold text-primaryText font-mono mt-0.5 block">
          {{ stats.totalFeedingsToday }}
        </span>
      </div>

      <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
        <span class="block text-[10px] font-semibold text-mutedText uppercase">Duración Media</span>
        <span class="text-xl font-extrabold text-primaryText font-mono mt-0.5 block">
          {{ stats.avgDurationMinutes }}<span class="text-xs font-normal text-mutedText ml-0.5">m</span>
        </span>
      </div>

      <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle text-center">
        <span class="block text-[10px] font-semibold text-mutedText uppercase">Descanso Medio</span>
        <span class="text-xl font-extrabold text-primaryText font-mono mt-0.5 block">
          {{ stats.avgRestIntervalMinutes }}<span class="text-xs font-normal text-mutedText ml-0.5">m</span>
        </span>
      </div>
    </div>

    <!-- Balance Bar: Left vs Right vs Bottle -->
    <div class="mb-5 p-3.5 rounded-2xl bg-subtle border border-borderSubtle">
      <div class="flex items-center justify-between text-xs font-semibold text-mutedText mb-2">
        <span>Balance de Pecho / Biberón</span>
      </div>

      <div class="h-3.5 w-full bg-borderSubtle rounded-full overflow-hidden flex">
        <div 
          class="h-full bg-breastLeft transition-all duration-500" 
          :style="{ width: `${stats.leftPercentage}%` }"
          title="Pecho Izquierdo"
        />
        <div 
          class="h-full bg-breastRight transition-all duration-500" 
          :style="{ width: `${stats.rightPercentage}%` }"
          title="Pecho Derecho"
        />
        <div 
          v-if="stats.bottlePercentage > 0"
          class="h-full bg-bottle transition-all duration-500" 
          :style="{ width: `${stats.bottlePercentage}%` }"
          title="Biberón"
        />
      </div>

      <div class="flex items-center justify-between mt-2 text-[11px] font-medium">
        <div class="flex items-center gap-1.5 text-breastLeft">
          <span class="w-2 h-2 rounded-full bg-breastLeft"></span>
          <span>Izq: {{ stats.leftPercentage }}%</span>
        </div>
        <div class="flex items-center gap-1.5 text-breastRight">
          <span class="w-2 h-2 rounded-full bg-breastRight"></span>
          <span>Der: {{ stats.rightPercentage }}%</span>
        </div>
        <div v-if="stats.bottlePercentage > 0" class="flex items-center gap-1.5 text-bottle">
          <span class="w-2 h-2 rounded-full bg-bottle"></span>
          <span>Bib: {{ stats.bottlePercentage }}%</span>
        </div>
      </div>
    </div>

    <!-- Chronological History List -->
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider text-mutedText mb-2.5 flex items-center gap-1.5">
        <Calendar class="w-3.5 h-3.5" />
        <span>Historial Reciente</span>
      </h3>

      <div v-if="feedings.length === 0" class="py-5 text-center text-xs text-mutedText">
        No hay tomas registradas todavía.
      </div>

      <div v-else class="space-y-2 max-h-64 overflow-y-auto pr-1">
        <div 
          v-for="item in feedings" 
          :key="item.id"
          class="p-3 rounded-xl bg-subtle border border-borderSubtle flex items-center justify-between gap-2"
        >
          <!-- Item info -->
          <div class="flex items-center gap-2.5 min-w-0">
            <span 
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :class="{
                'bg-breastLeft': item.breast_side === 'left',
                'bg-breastRight': item.breast_side === 'right',
                'bg-bottle': item.breast_side === 'both' || item.feeding_type === 'bottle'
              }"
            />
            <div class="min-w-0">
              <div class="text-xs font-bold text-primaryText truncate">
                <span v-if="item.feeding_type === 'bottle'">Biberón ({{ item.amount_ml || 0 }} ml)</span>
                <span v-else-if="item.breast_side === 'left'">Pecho Izquierdo</span>
                <span v-else-if="item.breast_side === 'right'">Pecho Derecho</span>
                <span v-else>Ambos Pechos (I: {{ Math.round(item.duration_left_seconds / 60) }}m / D: {{ Math.round(item.duration_right_seconds / 60) }}m)</span>
              </div>
              <div class="text-[11px] text-mutedText flex items-center gap-2">
                <span>{{ formatDate(item.started_at) }} • {{ formatTime(item.started_at) }}</span>
                <span>•</span>
                <span class="font-semibold">{{ formatDuration(item.duration_seconds) }}</span>
              </div>
            </div>
          </div>

          <!-- Delete action -->
          <button 
            type="button" 
            @click="emit('delete-feeding', item.id)"
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
