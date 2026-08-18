<script setup lang="ts">
import { computed } from 'vue';
import { Play, Pause, X, Check, Moon, MessageSquare } from 'lucide-vue-next';
import type { ActiveSleepSession } from '~/types/baby-tracker';

const props = defineProps<{
  session: ActiveSleepSession;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'pause'): void;
  (e: 'resume'): void;
  (e: 'finish'): void;
  (e: 'cancel'): void;
  (e: 'update:notes', val: string): void;
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
            <span v-if="!session.isPaused" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-bottle opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3" :class="session.isPaused ? 'bg-warningSoft' : 'bg-bottle'"></span>
          </span>
          <h3 class="text-base font-bold text-primaryText flex items-center gap-1.5">
            <Moon class="w-4 h-4 text-bottle" />
            <span>{{ session.isPaused ? 'Sueño en Pausa' : 'Bebé Durmiendo' }}</span>
          </h3>
        </div>
        <button 
          type="button" 
          @click="emit('cancel')" 
          class="p-1.5 text-mutedText hover:text-primaryText rounded-full hover:bg-subtle"
          title="Descartar"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Live Duration Clock -->
      <div class="text-center my-6 py-6 bg-bottle-soft/40 rounded-2xl border border-bottle-border/50">
        <span class="text-xs font-semibold uppercase tracking-wider text-mutedText">Tiempo de Sueño</span>
        <div class="text-5xl font-black font-mono tracking-tight text-primaryText tabular-nums mt-1">
          {{ formatDuration(session.elapsedSeconds) }}
        </div>
        <span class="text-xs text-mutedText mt-1 block">
          {{ session.isPaused ? 'En pausa' : 'Cronómetro activo' }}
        </span>
      </div>

      <!-- Notes and Comments Section -->
      <div class="mb-5">
        <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1 flex items-center gap-1">
          <MessageSquare class="w-3 h-3" />
          <span>Comentarios del sueño</span>
        </label>
        <textarea
          :value="session.notes"
          @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
          rows="2"
          placeholder="Ej. Se durmió en su cuna, con ruido blanco, tranquilo..."
          class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-bottle/40 resize-none"
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Pause / Resume Button -->
        <button
          type="button"
          v-if="!session.isPaused"
          @click="emit('pause')"
          class="py-3 px-4 rounded-2xl bg-subtle border border-borderSubtle text-primaryText font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-borderSubtle"
        >
          <Pause class="w-4 h-4" />
          <span>Pausar</span>
        </button>
        <button
          type="button"
          v-else
          @click="emit('resume')"
          class="py-3 px-4 rounded-2xl bg-subtle border border-borderSubtle text-primaryText font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-borderSubtle"
        >
          <Play class="w-4 h-4 fill-current" />
          <span>Reanudar</span>
        </button>

        <!-- Finish / Awake Button -->
        <button
          type="button"
          :disabled="session.elapsedSeconds === 0 || isLoading"
          @click="emit('finish')"
          class="py-3 px-4 rounded-2xl bg-primaryText text-surface font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm hover:opacity-90"
        >
          <Check class="w-4 h-4 stroke-[3]" />
          <span>{{ isLoading ? 'Guardando...' : 'Despertó' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>
