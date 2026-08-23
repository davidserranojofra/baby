<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Moon, Clock, Play, Pause, Plus, Sparkles, Check, Maximize2, ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-vue-next';
import type { SleepLog, ActiveSleepSession, SleepStatsSummary } from '~/types/baby-tracker';

const props = withDefaults(defineProps<{
  lastSleep: SleepLog | null;
  activeSession?: ActiveSleepSession;
  selectedDate?: string;
  dateStats?: SleepStatsSummary;
  isLoading?: boolean;
}>(), {
  selectedDate: () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
});

const emit = defineEmits<{
  (e: 'start-sleep'): void;
  (e: 'open-manual'): void;
  (e: 'open-active-modal'): void;
  (e: 'pause-sleep'): void;
  (e: 'resume-sleep'): void;
  (e: 'finish-sleep'): void;
  (e: 'update:date', date: string): void;
  (e: 'navigate-date', step: number): void;
  (e: 'go-today'): void;
}>();

const todayStr = computed(() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
});

const isSelectedToday = computed(() => props.selectedDate === todayStr.value);

const formattedDateLabel = computed(() => {
  if (isSelectedToday.value) {
    const d = new Date();
    return `Hoy (${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`;
  }
  const parts = props.selectedDate.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
});

// Dynamic Elapsed Awake Counter
const elapsedAwakeSeconds = ref<number>(0);
let awakeTimer: ReturnType<typeof setInterval> | null = null;

const updateElapsedAwake = () => {
  if (!props.lastSleep?.ended_at) {
    elapsedAwakeSeconds.value = 0;
    return;
  }
  const endedTime = new Date(props.lastSleep.ended_at).getTime();
  const now = Date.now();
  elapsedAwakeSeconds.value = Math.max(0, Math.floor((now - endedTime) / 1000));
};

onMounted(() => {
  updateElapsedAwake();
  awakeTimer = setInterval(updateElapsedAwake, 1000);
});

onUnmounted(() => {
  if (awakeTimer) clearInterval(awakeTimer);
});

const formattedAwakeTime = computed(() => {
  if (!props.lastSleep) return '--:--:--';
  const hours = Math.floor(elapsedAwakeSeconds.value / 3600);
  const minutes = Math.floor((elapsedAwakeSeconds.value % 3600) / 60);
  const seconds = elapsedAwakeSeconds.value % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
});

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};

const formatReadableDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m > 0 ? `${m}m` : ''}`;
};
</script>

<template>
  <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all space-y-4">
    
    <!-- Top Date Navigation Selector Bar -->
    <div class="flex items-center justify-between bg-subtle p-1.5 rounded-2xl border border-borderSubtle">
      <button
        type="button"
        @click="emit('navigate-date', -1)"
        class="p-2 rounded-xl bg-surface hover:bg-borderSubtle text-primaryText transition-all active:scale-95 border border-borderSubtle/60 shadow-xs"
        title="Día anterior"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <div class="relative flex items-center gap-1.5 cursor-pointer">
        <Calendar class="w-3.5 h-3.5 text-bottle" />
        <span class="text-xs font-bold text-primaryText capitalize">{{ formattedDateLabel }}</span>
        <input 
          type="date"
          :value="selectedDate"
          :max="todayStr"
          @change="emit('update:date', ($event.target as HTMLInputElement).value)"
          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title="Elegir fecha"
        />
      </div>

      <div class="flex items-center gap-1">
        <button
          v-if="!isSelectedToday"
          type="button"
          @click="emit('go-today')"
          class="px-2 py-1 rounded-xl bg-bottle-soft hover:bg-bottle-border text-bottle font-bold text-[10px] transition-all flex items-center gap-1 border border-bottle-border"
          title="Ir a hoy"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Hoy</span>
        </button>

        <button
          type="button"
          :disabled="isSelectedToday"
          @click="emit('navigate-date', 1)"
          class="p-2 rounded-xl bg-surface hover:bg-borderSubtle text-primaryText transition-all active:scale-95 border border-borderSubtle/60 shadow-xs disabled:opacity-30 disabled:pointer-events-none"
          title="Día siguiente"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- IF ACTIVE LIVE SESSION IS RUNNING -->
    <div v-if="activeSession?.isActive" class="space-y-4 pt-1">
      <!-- Active Header -->
      <div class="flex items-center justify-between pb-3 border-b border-borderSubtle">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-bottle-soft flex items-center justify-center text-bottle relative">
            <Moon class="w-4 h-4" />
            <span 
              v-if="!activeSession.isPaused" 
              class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-bottle ring-2 ring-surface animate-pulse" 
            />
          </div>
          <div>
            <h2 class="text-xs font-bold uppercase tracking-wider text-bottle">Registro en Curso</h2>
            <p class="text-sm font-extrabold text-primaryText">
              {{ activeSession.isPaused ? 'Sueño en Pausa' : 'Bebé Durmiendo' }}
            </p>
          </div>
        </div>

        <button 
          type="button" 
          @click="emit('open-active-modal')"
          class="px-2.5 py-1 rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText hover:text-primaryText text-xs font-semibold flex items-center gap-1 border border-borderSubtle transition-all"
          title="Ver pantalla completa y notas"
        >
          <Maximize2 class="w-3.5 h-3.5" />
          <span>Ver detalles</span>
        </button>
      </div>

      <!-- Live Elapsed Time Card -->
      <div class="py-5 px-3 bg-bottle-soft/40 rounded-2xl flex flex-col items-center justify-center text-center border border-bottle-border/50">
        <span class="text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Tiempo de sueño acumulado</span>
        <div class="text-4xl sm:text-5xl font-black font-mono tracking-tight text-primaryText tabular-nums">
          {{ formatDuration(activeSession.elapsedSeconds) }}
        </div>
        <span class="text-[11px] text-mutedText mt-1">
          {{ activeSession.isPaused ? 'Cronómetro en pausa' : 'Corriendo en segundo plano mientras navegás' }}
        </span>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Pause / Resume -->
        <button
          type="button"
          v-if="!activeSession.isPaused"
          @click="emit('pause-sleep')"
          class="py-3 px-4 rounded-2xl bg-subtle border border-borderSubtle text-primaryText font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-borderSubtle"
        >
          <Pause class="w-4 h-4" />
          <span>Pausar</span>
        </button>
        <button
          type="button"
          v-else
          @click="emit('resume-sleep')"
          class="py-3 px-4 rounded-2xl bg-bottle-soft border border-bottle-border text-bottle font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-bottle-border"
        >
          <Play class="w-4 h-4 fill-current" />
          <span>Reanudar</span>
        </button>

        <!-- Finish & Save -->
        <button
          type="button"
          :disabled="activeSession.elapsedSeconds === 0 || isLoading"
          @click="emit('finish-sleep')"
          class="py-3 px-4 rounded-2xl bg-bottle text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm hover:opacity-95"
        >
          <Check class="w-4 h-4 stroke-[3]" />
          <span>{{ isLoading ? 'Guardando...' : 'Despertó (Guardar)' }}</span>
        </button>
      </div>
    </div>

    <!-- ELSE: NORMAL IDLE VIEW -->
    <div v-else class="space-y-4 pt-1">
      <!-- Header Status -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-bottle-soft flex items-center justify-center text-bottle">
            <Moon class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wider text-mutedText">
              {{ isSelectedToday ? 'Último Sueño / Siesta' : `Último Sueño (${formattedDateLabel})` }}
            </h2>
            <p class="text-sm font-bold text-primaryText flex items-center gap-1.5">
              {{ props.lastSleep ? `Durmió ${formatReadableDuration(props.lastSleep.duration_seconds)}` : 'Sin registros para este día' }}
            </p>
          </div>
        </div>

        <div 
          v-if="props.lastSleep?.notes"
          class="max-w-[140px] truncate text-[11px] text-mutedText bg-subtle px-2 py-0.5 rounded-full border border-borderSubtle"
          :title="props.lastSleep.notes"
        >
          {{ props.lastSleep.notes }}
        </div>
      </div>

      <!-- Central Awake Timer Display (for today) or Day Sleep Summary (for past dates) -->
      <div v-if="isSelectedToday" class="my-4 py-4 px-3 bg-subtle rounded-2xl flex flex-col items-center justify-center text-center border border-borderSubtle">
        <div class="flex items-center gap-1.5 text-mutedText text-xs font-medium mb-1">
          <Clock class="w-3.5 h-3.5" />
          <span>Tiempo despierto (Ventana de sueño)</span>
        </div>
        <div class="text-3xl sm:text-4xl font-extrabold tracking-tight text-primaryText font-mono tabular-nums">
          {{ formattedAwakeTime }}
        </div>
        <span class="text-[11px] text-mutedText mt-0.5">
          {{ props.lastSleep ? `Despertó a las ${new Date(props.lastSleep.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Inicia una siesta o sueño nocturno' }}
        </span>
      </div>

      <div v-else class="my-4 py-4 px-3 bg-bottle-soft/30 rounded-2xl flex flex-col items-center justify-center text-center border border-bottle-border/40">
        <div class="flex items-center gap-1.5 text-bottle text-xs font-bold mb-1">
          <Moon class="w-3.5 h-3.5" />
          <span>Resumen de Sueño: {{ formattedDateLabel }}</span>
        </div>
        <div class="text-3xl sm:text-4xl font-extrabold tracking-tight text-primaryText font-mono tabular-nums">
          {{ dateStats?.totalSleepFormatted || '0m' }}
        </div>
        <span class="text-[11px] text-mutedText mt-0.5">
          {{ dateStats ? `${dateStats.napCountToday} siestas registradas (Media: ${dateStats.avgNapMinutesToday}m)` : 'Sin registros' }}
        </span>
      </div>

      <!-- Quick Play Sleep Button -->
      <button
        type="button"
        @click="emit('start-sleep')"
        class="w-full py-4 px-4 rounded-2xl bg-bottle-soft border-2 border-bottle-border text-primaryText flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-soft-sm hover:opacity-95"
      >
        <div class="w-9 h-9 rounded-full bg-bottle text-white flex items-center justify-center shadow-sm">
          <Play class="w-4 h-4 ml-0.5 fill-current" />
        </div>
        <div class="text-left">
          <span class="text-xs font-bold text-primaryText block">A Dormir (Iniciar Cronómetro)</span>
          <span class="text-[10px] text-mutedText block">Comienza a registrar el sueño en vivo</span>
        </div>
      </button>

      <!-- Manual Register Button -->
      <button
        type="button"
        @click="emit('open-manual')"
        class="w-full mt-3 py-2.5 px-4 rounded-xl bg-subtle border border-borderSubtle text-secondaryText hover:text-primaryText text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Registrar sueño manual / retroactivo</span>
      </button>
    </div>

  </section>
</template>


