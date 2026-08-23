<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Clock, Play, Pause, Plus, Baby, Sparkles, ArrowRightLeft, Check, Maximize2 } from 'lucide-vue-next';
import type { Feeding, ActiveFeedingSession } from '~/types/baby-tracker';

const props = defineProps<{
  lastFeeding: Feeding | null;
  activeSession?: ActiveFeedingSession;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'start-breast', side: 'left' | 'right'): void;
  (e: 'open-manual'): void;
  (e: 'open-active-modal'): void;
  (e: 'switch-side', side: 'left' | 'right'): void;
  (e: 'pause-feeding'): void;
  (e: 'resume-feeding', side: 'left' | 'right'): void;
  (e: 'finish-feeding'): void;
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

const formatSeconds = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const totalFeedingSeconds = computed(() => {
  if (!props.activeSession) return 0;
  return props.activeSession.leftSeconds + props.activeSession.rightSeconds;
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
    
    <!-- IF ACTIVE LIVE FEEDING SESSION IS RUNNING -->
    <div v-if="activeSession?.isActive" class="space-y-4">
      <!-- Active Header -->
      <div class="flex items-center justify-between pb-3 border-b border-borderSubtle">
        <div class="flex items-center gap-2">
          <div 
            class="w-8 h-8 rounded-xl flex items-center justify-center relative transition-colors"
            :class="activeSession.activeSide === 'left' ? 'bg-breastLeft-soft text-breastLeft' : activeSession.activeSide === 'right' ? 'bg-breastRight-soft text-breastRight' : 'bg-subtle text-mutedText'"
          >
            <Baby class="w-4 h-4" />
            <span 
              v-if="activeSession.activeSide" 
              class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface animate-pulse"
              :class="activeSession.activeSide === 'left' ? 'bg-breastLeft' : 'bg-breastRight'" 
            />
          </div>
          <div>
            <h2 class="text-xs font-bold uppercase tracking-wider text-primaryText">Toma en Curso</h2>
            <p class="text-sm font-extrabold text-primaryText">
              {{ activeSession.activeSide === 'left' ? 'Pecho Izquierdo Activo' : activeSession.activeSide === 'right' ? 'Pecho Derecho Activo' : 'Toma en Pausa' }}
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

      <!-- Live Dual Durations Card -->
      <div class="py-4 px-3 bg-subtle rounded-2xl border border-borderSubtle">
        <div class="text-center mb-3">
          <span class="text-[11px] font-semibold text-mutedText uppercase tracking-wider block">Duración Total</span>
          <span class="text-4xl font-black font-mono tracking-tight text-primaryText tabular-nums block mt-0.5">
            {{ formatSeconds(totalFeedingSeconds) }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <!-- Left Breast Mini Status -->
          <button
            type="button"
            @click="activeSession.activeSide === 'left' ? emit('pause-feeding') : emit('switch-side', 'left')"
            class="p-2.5 rounded-xl border text-center transition-all active:scale-[0.98]"
            :class="activeSession.activeSide === 'left' ? 'bg-breastLeft-soft border-breastLeft text-breastLeft ring-2 ring-breastLeft/30' : 'bg-surface border-borderSubtle text-mutedText hover:border-breastLeft-border'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider block">Izq.</span>
            <span class="text-lg font-black font-mono tabular-nums block mt-0.5 text-primaryText">{{ formatSeconds(activeSession.leftSeconds) }}</span>
            <span class="text-[9px] font-semibold block mt-0.5" :class="activeSession.activeSide === 'left' ? 'text-breastLeft' : 'text-mutedText'">
              {{ activeSession.activeSide === 'left' ? 'Activo' : 'Tocar para activar' }}
            </span>
          </button>

          <!-- Right Breast Mini Status -->
          <button
            type="button"
            @click="activeSession.activeSide === 'right' ? emit('pause-feeding') : emit('switch-side', 'right')"
            class="p-2.5 rounded-xl border text-center transition-all active:scale-[0.98]"
            :class="activeSession.activeSide === 'right' ? 'bg-breastRight-soft border-breastRight text-breastRight ring-2 ring-breastRight/30' : 'bg-surface border-borderSubtle text-mutedText hover:border-breastRight-border'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider block">Der.</span>
            <span class="text-lg font-black font-mono tabular-nums block mt-0.5 text-primaryText">{{ formatSeconds(activeSession.rightSeconds) }}</span>
            <span class="text-[9px] font-semibold block mt-0.5" :class="activeSession.activeSide === 'right' ? 'text-breastRight' : 'text-mutedText'">
              {{ activeSession.activeSide === 'right' ? 'Activo' : 'Tocar para activar' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Pause / Resume -->
        <button
          type="button"
          v-if="activeSession.activeSide"
          @click="emit('pause-feeding')"
          class="py-3 px-4 rounded-2xl bg-subtle border border-borderSubtle text-primaryText font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-borderSubtle"
        >
          <Pause class="w-4 h-4" />
          <span>Pausar</span>
        </button>
        <button
          type="button"
          v-else
          @click="emit('resume-feeding', activeSession.leftSeconds >= activeSession.rightSeconds ? 'right' : 'left')"
          class="py-3 px-4 rounded-2xl bg-subtle border border-borderSubtle text-primaryText font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-borderSubtle"
        >
          <Play class="w-4 h-4 fill-current" />
          <span>Reanudar</span>
        </button>

        <!-- Finish & Save -->
        <button
          type="button"
          :disabled="totalFeedingSeconds === 0 || isLoading"
          @click="emit('finish-feeding')"
          class="py-3 px-4 rounded-2xl bg-primaryText text-surface font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm hover:opacity-90"
        >
          <Check class="w-4 h-4 stroke-[3]" />
          <span>{{ isLoading ? 'Guardando...' : 'Finalizar' }}</span>
        </button>
      </div>
    </div>

    <!-- ELSE: NORMAL IDLE VIEW -->
    <div v-else>
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
    </div>

  </section>
</template>

