<script setup lang="ts">
import { computed } from 'vue';
import { Play, Pause, Square, X, RotateCcw, Check, Sparkles } from 'lucide-vue-next';
import type { ActiveFeedingSession } from '~/types/baby-tracker';

const props = defineProps<{
  session: ActiveFeedingSession;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'switch-side', side: 'left' | 'right'): void;
  (e: 'pause'): void;
  (e: 'resume', side: 'left' | 'right'): void;
  (e: 'finish'): void;
  (e: 'cancel'): void;
  (e: 'update:notes', val: string): void;
}>();

const formatSeconds = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const totalSeconds = computed(() => {
  return props.session.leftSeconds + props.session.rightSeconds;
});

const isPaused = computed(() => {
  return props.session.activeSide === null;
});
</script>

<template>
  <div 
    v-if="session.isActive" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all"
  >
    <div class="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-soft-lg border border-borderSubtle animate-in slide-in-from-bottom-6 duration-200">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b border-borderSubtle">
        <div class="flex items-center gap-2">
          <span class="flex h-3 w-3 relative">
            <span v-if="!isPaused" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-meds opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3" :class="isPaused ? 'bg-warningSoft' : 'bg-meds'"></span>
          </span>
          <h3 class="text-base font-bold text-primaryText">
            {{ isPaused ? 'Toma Pausada' : 'Toma en Curso' }}
          </h3>
        </div>
        <button 
          type="button" 
          @click="emit('cancel')" 
          class="p-1.5 text-mutedText hover:text-primaryText rounded-full hover:bg-subtle"
          title="Descartar toma"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Total Duration Clock -->
      <div class="text-center my-6">
        <span class="text-xs font-semibold uppercase tracking-wider text-mutedText">Duración Total</span>
        <div class="text-5xl font-black font-mono tracking-tight text-primaryText tabular-nums mt-1">
          {{ formatSeconds(totalSeconds) }}
        </div>
      </div>

      <!-- Side-by-Side Dual Timers & Switch Controls -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <!-- Left Breast Control -->
        <button
          type="button"
          @click="session.activeSide === 'left' ? emit('pause') : emit('switch-side', 'left')"
          class="p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden active:scale-[0.98]"
          :class="session.activeSide === 'left' 
            ? 'bg-breastLeft-soft border-breastLeft text-primaryText shadow-md ring-2 ring-breastLeft/30' 
            : 'bg-subtle border-borderSubtle text-secondaryText hover:border-breastLeft-border'"
        >
          <span class="text-xs font-bold uppercase tracking-wider text-breastLeft">Pecho Izquierdo</span>
          <span class="text-2xl font-black font-mono my-1 tabular-nums">{{ formatSeconds(session.leftSeconds) }}</span>
          <span class="text-[11px] font-semibold flex items-center gap-1" :class="session.activeSide === 'left' ? 'text-breastLeft' : 'text-mutedText'">
            <span v-if="session.activeSide === 'left'" class="w-2 h-2 rounded-full bg-breastLeft animate-pulse" />
            {{ session.activeSide === 'left' ? 'Grabando...' : 'Tocar para activar' }}
          </span>
        </button>

        <!-- Right Breast Control -->
        <button
          type="button"
          @click="session.activeSide === 'right' ? emit('pause') : emit('switch-side', 'right')"
          class="p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden active:scale-[0.98]"
          :class="session.activeSide === 'right' 
            ? 'bg-breastRight-soft border-breastRight text-primaryText shadow-md ring-2 ring-breastRight/30' 
            : 'bg-subtle border-borderSubtle text-secondaryText hover:border-breastRight-border'"
        >
          <span class="text-xs font-bold uppercase tracking-wider text-breastRight">Pecho Derecho</span>
          <span class="text-2xl font-black font-mono my-1 tabular-nums">{{ formatSeconds(session.rightSeconds) }}</span>
          <span class="text-[11px] font-semibold flex items-center gap-1" :class="session.activeSide === 'right' ? 'text-breastRight' : 'text-mutedText'">
            <span v-if="session.activeSide === 'right'" class="w-2 h-2 rounded-full bg-breastRight animate-pulse" />
            {{ session.activeSide === 'right' ? 'Grabando...' : 'Tocar para activar' }}
          </span>
        </button>
      </div>

      <!-- Notes Field -->
      <div class="mb-5">
        <label class="block text-xs font-medium text-mutedText mb-1">Notas (opcional):</label>
        <input
          type="text"
          :value="session.notes"
          @input="emit('update:notes', ($event.target as HTMLInputElement).value)"
          placeholder="Ej. Quedó satisfecho, buen agarre..."
          class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-breastLeft/40"
        />
      </div>

      <!-- Main Action Buttons -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Pause / Resume Button -->
        <button
          type="button"
          v-if="!isPaused"
          @click="emit('pause')"
          class="py-3 px-4 rounded-2xl bg-subtle border border-borderSubtle text-primaryText font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-borderSubtle"
        >
          <Pause class="w-4 h-4" />
          <span>Pausar</span>
        </button>
        <button
          type="button"
          v-else
          @click="emit('resume', session.leftSeconds >= session.rightSeconds ? 'right' : 'left')"
          class="py-3 px-4 rounded-2xl bg-subtle border border-borderSubtle text-primaryText font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-borderSubtle"
        >
          <Play class="w-4 h-4 fill-current" />
          <span>Reanudar</span>
        </button>

        <!-- Finish & Save Button -->
        <button
          type="button"
          :disabled="totalSeconds === 0 || isLoading"
          @click="emit('finish')"
          class="py-3 px-4 rounded-2xl bg-primaryText text-surface font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm hover:opacity-90"
        >
          <Check class="w-4 h-4 stroke-[3]" />
          <span>{{ isLoading ? 'Guardando...' : 'Finalizar' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>
