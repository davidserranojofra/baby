<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Moon, Clock, Play, Plus, Sparkles, BedDouble } from 'lucide-vue-next';
import type { SleepLog } from '~/types/baby-tracker';

const props = defineProps<{
  lastSleep: SleepLog | null;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'start-sleep'): void;
  (e: 'open-manual'): void;
}>();

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
  if (h === 0) return `${m} min`;
  return `${h}h ${m > 0 ? `${m}m` : ''}`;
};
</script>

<template>
  <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all">
    <!-- Header Status -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-bottle-soft flex items-center justify-center text-bottle">
          <Moon class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-mutedText">Último Sueño / Siesta</h2>
          <p class="text-sm font-bold text-primaryText flex items-center gap-1.5">
            {{ props.lastSleep ? `Durmió ${formatDuration(props.lastSleep.duration_seconds)}` : 'Sin registros previos' }}
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

    <!-- Central Awake Timer Display -->
    <div class="my-4 py-4 px-3 bg-subtle rounded-2xl flex flex-col items-center justify-center text-center border border-borderSubtle">
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
        <span class="text-[10px] text-mutedText block">Comienza a registrar el sueño ahora</span>
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
  </section>
</template>
