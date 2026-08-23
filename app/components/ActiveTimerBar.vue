<script setup lang="ts">
import { computed } from 'vue';
import { Moon, Baby, Milk, Play, Pause, Check, Maximize2, Sparkles, ArrowRightLeft } from 'lucide-vue-next';
import type { ActiveSleepSession, ActiveFeedingSession, ActiveFeedingSide } from '~/types/baby-tracker';

const props = defineProps<{
  sleepSession?: ActiveSleepSession;
  feedingSession?: ActiveFeedingSession;
  isSleepLoading?: boolean;
  isFeedingLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'expand-sleep'): void;
  (e: 'expand-feeding'): void;
  (e: 'pause-sleep'): void;
  (e: 'resume-sleep'): void;
  (e: 'finish-sleep'): void;
  (e: 'pause-feeding'): void;
  (e: 'resume-feeding', mode?: ActiveFeedingSide): void;
  (e: 'switch-feeding-mode', mode: ActiveFeedingSide): void;
  (e: 'switch-feeding-side', side: 'left' | 'right'): void;
  (e: 'finish-feeding'): void;
}>();

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};

const totalFeedingSeconds = computed(() => {
  if (!props.feedingSession) return 0;
  return (
    props.feedingSession.leftSeconds +
    props.feedingSession.rightSeconds +
    (props.feedingSession.bottleMaternalSeconds || 0) +
    (props.feedingSession.bottleFormulaSeconds || 0)
  );
});

const feedingTitle = computed(() => {
  if (!props.feedingSession || !props.feedingSession.activeSide) return 'Toma pausada';
  switch (props.feedingSession.activeSide) {
    case 'left': return 'Pecho Izquierdo';
    case 'right': return 'Pecho Derecho';
    case 'bottle_maternal': return 'Biberón Materna';
    case 'bottle_formula': return 'Biberón Fórmula';
    default: return 'Toma en curso';
  }
});

const isSleepActive = computed(() => !!props.sleepSession?.isActive);
const isFeedingActive = computed(() => !!props.feedingSession?.isActive);
const hasAnyActive = computed(() => isSleepActive.value || isFeedingActive.value);
</script>

<template>
  <div 
    v-if="hasAnyActive" 
    class="fixed bottom-20 inset-x-3 max-w-md mx-auto z-30 flex flex-col gap-2 pointer-events-none"
  >
    <!-- 1. Active Sleep Mini-Bar -->
    <div
      v-if="isSleepActive && sleepSession"
      class="pointer-events-auto w-full bg-surface/95 dark:bg-surface/95 backdrop-blur-md border border-bottle-border/70 rounded-2xl p-2.5 shadow-soft-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 transition-all hover:border-bottle"
    >
      <!-- Clickable Area to Expand -->
      <div 
        @click="emit('expand-sleep')"
        class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
        title="Tocar para abrir pantalla completa"
      >
        <div class="w-9 h-9 rounded-xl bg-bottle-soft flex items-center justify-center text-bottle flex-shrink-0 relative">
          <Moon class="w-4 h-4" />
          <span 
            v-if="!sleepSession.isPaused" 
            class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-bottle ring-2 ring-surface animate-pulse" 
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-primaryText truncate">
              {{ sleepSession.isPaused ? 'Sueño en pausa' : 'Bebé durmiendo' }}
            </span>
            <span 
              v-if="sleepSession.isPaused" 
              class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-warningSoft-soft text-warningSoft border border-warningSoft-border"
            >
              Pausa
            </span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-sm font-black font-mono tracking-tight text-bottle tabular-nums">
              {{ formatDuration(sleepSession.elapsedSeconds) }}
            </span>
            <span class="text-[10px] text-mutedText flex items-center gap-0.5">
              <Maximize2 class="w-2.5 h-2.5" /> Ampliar
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- Play / Pause Button -->
        <button
          type="button"
          v-if="!sleepSession.isPaused"
          @click.stop="emit('pause-sleep')"
          class="p-2 rounded-xl bg-subtle hover:bg-borderSubtle text-primaryText transition-all active:scale-95 border border-borderSubtle"
          title="Pausar cronómetro"
        >
          <Pause class="w-4 h-4" />
        </button>
        <button
          type="button"
          v-else
          @click.stop="emit('resume-sleep')"
          class="p-2 rounded-xl bg-bottle-soft hover:bg-bottle-border text-bottle transition-all active:scale-95 border border-bottle-border"
          title="Reanudar cronómetro"
        >
          <Play class="w-4 h-4 fill-current" />
        </button>

        <!-- Finish Button -->
        <button
          type="button"
          :disabled="sleepSession.elapsedSeconds === 0 || isSleepLoading"
          @click.stop="emit('finish-sleep')"
          class="py-1.5 px-3 rounded-xl bg-bottle hover:opacity-90 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 shadow-soft-sm"
          title="Finalizar registro de sueño"
        >
          <Check class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{{ isSleepLoading ? '...' : 'Despertó' }}</span>
        </button>
      </div>
    </div>

    <!-- 2. Active Feeding Mini-Bar -->
    <div
      v-if="isFeedingActive && feedingSession"
      class="pointer-events-auto w-full bg-surface/95 dark:bg-surface/95 backdrop-blur-md border border-borderSubtle rounded-2xl p-2.5 shadow-soft-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 transition-all"
      :class="{
        'border-breastLeft-border/80 hover:border-breastLeft': feedingSession.activeSide === 'left',
        'border-breastRight-border/80 hover:border-breastRight': feedingSession.activeSide === 'right',
        'border-bottle-border/80 hover:border-bottle': feedingSession.activeSide === 'bottle_maternal',
        'border-warningSoft-border/80 hover:border-warningSoft': feedingSession.activeSide === 'bottle_formula',
        'border-borderSubtle': !feedingSession.activeSide
      }"
    >
      <!-- Clickable Area to Expand -->
      <div 
        @click="emit('expand-feeding')"
        class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
        title="Tocar para abrir pantalla completa"
      >
        <div 
          class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative transition-colors"
          :class="{
            'bg-breastLeft-soft text-breastLeft': feedingSession.activeSide === 'left',
            'bg-breastRight-soft text-breastRight': feedingSession.activeSide === 'right',
            'bg-bottle-soft text-bottle': feedingSession.activeSide === 'bottle_maternal',
            'bg-warningSoft-soft text-warningSoft': feedingSession.activeSide === 'bottle_formula',
            'bg-subtle text-mutedText': !feedingSession.activeSide
          }"
        >
          <Baby v-if="feedingSession.activeSide === 'left' || feedingSession.activeSide === 'right'" class="w-4 h-4" />
          <Milk v-else-if="feedingSession.activeSide === 'bottle_maternal' || feedingSession.activeSide === 'bottle_formula'" class="w-4 h-4" />
          <Baby v-else class="w-4 h-4" />

          <span 
            v-if="feedingSession.activeSide" 
            class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface animate-pulse"
            :class="{
              'bg-breastLeft': feedingSession.activeSide === 'left',
              'bg-breastRight': feedingSession.activeSide === 'right',
              'bg-bottle': feedingSession.activeSide === 'bottle_maternal',
              'bg-warningSoft': feedingSession.activeSide === 'bottle_formula'
            }" 
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-primaryText truncate">
              {{ feedingTitle }}
            </span>
            <span 
              v-if="!feedingSession.activeSide" 
              class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-warningSoft-soft text-warningSoft border border-warningSoft-border"
            >
              Pausa
            </span>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-sm font-black font-mono tracking-tight text-primaryText tabular-nums">
              {{ formatDuration(totalFeedingSeconds) }}
            </span>
            <span class="text-[10px] text-mutedText flex items-center gap-0.5">
              <Maximize2 class="w-2.5 h-2.5" /> Ampliar
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- Pause / Resume Button -->
        <button
          type="button"
          v-if="feedingSession.activeSide"
          @click.stop="emit('pause-feeding')"
          class="p-2 rounded-xl bg-subtle hover:bg-borderSubtle text-primaryText transition-all active:scale-95 border border-borderSubtle"
          title="Pausar toma"
        >
          <Pause class="w-4 h-4" />
        </button>
        <button
          type="button"
          v-else
          @click.stop="emit('resume-feeding', 'left')"
          class="p-2 rounded-xl bg-subtle hover:bg-borderSubtle text-primaryText transition-all active:scale-95 border border-borderSubtle"
          title="Reanudar toma"
        >
          <Play class="w-4 h-4 fill-current" />
        </button>

        <!-- Finish Button -->
        <button
          type="button"
          :disabled="totalFeedingSeconds === 0 || isFeedingLoading"
          @click.stop="emit('finish-feeding')"
          class="py-1.5 px-3 rounded-xl bg-primaryText text-surface font-bold text-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 shadow-soft-sm hover:opacity-90"
          title="Finalizar toma"
        >
          <Check class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{{ isFeedingLoading ? '...' : 'Fin' }}</span>
        </button>
      </div>
    </div>

  </div>
</template>

