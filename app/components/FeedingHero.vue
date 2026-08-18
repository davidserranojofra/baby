<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Clock, Play, Plus, Baby, Sparkles } from 'lucide-vue-next';
import type { Feeding } from '~/types/baby-tracker';

const props = defineProps<{
  lastFeeding: Feeding | null;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'start-breast', side: 'left' | 'right'): void;
  (e: 'open-manual'): void;
}>();

// Dynamic Elapsed Rest Counter
const elapsedRestSeconds = ref<number>(0);
let restTimer: ReturnType<typeof setInterval> | null = null;

const updateElapsedRest = () => {
  if (!props.lastFeeding?.ended_at) {
    elapsedRestSeconds.value = 0;
    return;
  }
  const endedTime = new Date(props.lastFeeding.ended_at).getTime();
  const now = Date.now();
  elapsedRestSeconds.value = Math.max(0, Math.floor((now - endedTime) / 1000));
};

onMounted(() => {
  updateElapsedRest();
  restTimer = setInterval(updateElapsedRest, 1000);
});

onUnmounted(() => {
  if (restTimer) clearInterval(restTimer);
});

// Format elapsed seconds to HH:MM:SS
const formattedRestTime = computed(() => {
  if (!props.lastFeeding) return '--:--:--';
  const hours = Math.floor(elapsedRestSeconds.value / 3600);
  const minutes = Math.floor((elapsedRestSeconds.value % 3600) / 60);
  const seconds = elapsedRestSeconds.value % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
});

const lastFeedingLabel = computed(() => {
  if (!props.lastFeeding) return 'Sin registros previos';
  if (props.lastFeeding.feeding_type === 'bottle') {
    return `Biberón (${props.lastFeeding.amount_ml || 0} ml)`;
  }
  if (props.lastFeeding.breast_side === 'left') return 'Pecho Izquierdo';
  if (props.lastFeeding.breast_side === 'right') return 'Pecho Derecho';
  if (props.lastFeeding.breast_side === 'both') return 'Ambos Pechos (I + D)';
  return 'Lactancia';
});

const nextSuggestedBreast = computed<'left' | 'right' | null>(() => {
  if (!props.lastFeeding || props.lastFeeding.feeding_type === 'bottle') return null;
  if (props.lastFeeding.breast_side === 'left') return 'right';
  if (props.lastFeeding.breast_side === 'right') return 'left';
  return null;
});
</script>

<template>
  <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all">
    <!-- Header Status -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-breastLeft-soft flex items-center justify-center text-breastLeft">
          <Baby class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-mutedText">Última Toma</h2>
          <p class="text-sm font-bold text-primaryText flex items-center gap-1.5">
            {{ lastFeedingLabel }}
            <span 
              v-if="props.lastFeeding?.breast_side === 'left'"
              class="inline-block w-2.5 h-2.5 rounded-full bg-breastLeft"
              title="Pecho Izquierdo"
            />
            <span 
              v-else-if="props.lastFeeding?.breast_side === 'right'"
              class="inline-block w-2.5 h-2.5 rounded-full bg-breastRight"
              title="Pecho Derecho"
            />
          </p>
        </div>
      </div>

      <!-- Suggested Next Badge -->
      <div 
        v-if="nextSuggestedBreast" 
        class="px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1"
        :class="nextSuggestedBreast === 'left' 
          ? 'bg-breastLeft-soft text-breastLeft border-breastLeft-border' 
          : 'bg-breastRight-soft text-breastRight border-breastRight-border'"
      >
        <Sparkles class="w-3 h-3" />
        <span>Toca: {{ nextSuggestedBreast === 'left' ? 'Izquierdo' : 'Derecho' }}</span>
      </div>
    </div>

    <!-- Central Rest Timer Display -->
    <div class="my-4 py-4 px-3 bg-subtle rounded-2xl flex flex-col items-center justify-center text-center border border-borderSubtle">
      <div class="flex items-center gap-1.5 text-mutedText text-xs font-medium mb-1">
        <Clock class="w-3.5 h-3.5" />
        <span>Tiempo de descanso</span>
      </div>
      <div class="text-3xl sm:text-4xl font-extrabold tracking-tight text-primaryText font-mono tabular-nums">
        {{ formattedRestTime }}
      </div>
      <span class="text-[11px] text-mutedText mt-0.5">
        {{ props.lastFeeding ? `Finalizó a las ${new Date(props.lastFeeding.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Inicia una nueva toma' }}
      </span>
    </div>

    <!-- Quick Action Ergonomic Action Buttons (Mobile-first Thumb Zone) -->
    <div class="grid grid-cols-2 gap-3 mt-3">
      <!-- Left Breast Quick Start -->
      <button
        type="button"
        @click="emit('start-breast', 'left')"
        class="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-breastLeft-soft border-2 border-breastLeft-border text-primaryText active:scale-[0.98] transition-transform shadow-soft-sm hover:opacity-95"
      >
        <div class="w-9 h-9 rounded-full bg-breastLeft text-white flex items-center justify-center mb-1.5 shadow-sm">
          <Play class="w-4 h-4 ml-0.5 fill-current" />
        </div>
        <span class="text-xs font-bold text-primaryText">Pecho Izq.</span>
        <span class="text-[10px] text-mutedText">Iniciar cronómetro</span>
      </button>

      <!-- Right Breast Quick Start -->
      <button
        type="button"
        @click="emit('start-breast', 'right')"
        class="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-breastRight-soft border-2 border-breastRight-border text-primaryText active:scale-[0.98] transition-transform shadow-soft-sm hover:opacity-95"
      >
        <div class="w-9 h-9 rounded-full bg-breastRight text-white flex items-center justify-center mb-1.5 shadow-sm">
          <Play class="w-4 h-4 ml-0.5 fill-current" />
        </div>
        <span class="text-xs font-bold text-primaryText">Pecho Der.</span>
        <span class="text-[10px] text-mutedText">Iniciar cronómetro</span>
      </button>
    </div>

    <!-- Manual Register Button -->
    <button
      type="button"
      @click="emit('open-manual')"
      class="w-full mt-3 py-2.5 px-4 rounded-xl bg-subtle border border-borderSubtle text-secondaryText hover:text-primaryText text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
    >
      <Plus class="w-3.5 h-3.5" />
      <span>Registrar toma manual o biberón</span>
    </button>
  </section>
</template>
