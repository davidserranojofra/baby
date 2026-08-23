<script setup lang="ts">
import { ref, computed } from 'vue';
import { Play, Pause, ChevronDown, Trash2, Check, AlertCircle, Baby, Milk, Droplets } from 'lucide-vue-next';
import type { ActiveFeedingSession, ActiveFeedingSide } from '~/types/baby-tracker';

const props = withDefaults(defineProps<{
  session: ActiveFeedingSession;
  isOpen: boolean;
  isLoading?: boolean;
}>(), {
  isOpen: false
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switch-mode', mode: ActiveFeedingSide): void;
  (e: 'set-bottle-amount', type: 'maternal' | 'formula', ml: number | null): void;
  (e: 'pause'): void;
  (e: 'resume', mode?: ActiveFeedingSide): void;
  (e: 'finish'): void;
  (e: 'cancel'): void;
  (e: 'update:notes', val: string): void;
}>();

const isConfirmingCancel = ref<boolean>(false);

const formatSeconds = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const totalSeconds = computed(() => {
  return (
    props.session.leftSeconds +
    props.session.rightSeconds +
    (props.session.bottleMaternalSeconds || 0) +
    (props.session.bottleFormulaSeconds || 0)
  );
});

const isPaused = computed(() => {
  return props.session.activeSide === null;
});

const handleBackdropClick = () => {
  isConfirmingCancel.value = false;
  emit('close');
};

const handleConfirmCancel = () => {
  isConfirmingCancel.value = false;
  emit('cancel');
};

const adjustMl = (type: 'maternal' | 'formula', delta: number) => {
  const current = type === 'maternal' ? (props.session.amountMaternalMl || 0) : (props.session.amountFormulaMl || 0);
  const newVal = Math.max(0, current + delta);
  emit('set-bottle-amount', type, newVal > 0 ? newVal : null);
};
</script>

<template>
  <div 
    v-if="isOpen && session.isActive" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all"
    @click.self="handleBackdropClick"
  >
    <div class="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-soft-lg border border-borderSubtle animate-in slide-in-from-bottom-6 duration-200 max-h-[90vh] overflow-y-auto">
      
      <!-- Modal Header with Minimize & Discard Controls -->
      <div class="flex items-center justify-between pb-3 border-b border-borderSubtle">
        <div class="flex items-center gap-2">
          <span class="flex h-3 w-3 relative">
            <span v-if="!isPaused" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-meds opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3" :class="isPaused ? 'bg-warningSoft' : 'bg-meds'"></span>
          </span>
          <h3 class="text-base font-bold text-primaryText">
            {{ isPaused ? 'Toma en Pausa' : 'Toma en Vivo' }}
          </h3>
        </div>

        <div class="flex items-center gap-1">
          <!-- Discard button -->
          <button 
            type="button" 
            @click="isConfirmingCancel = !isConfirmingCancel" 
            class="p-2 text-mutedText hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors"
            title="Descartar toma"
          >
            <Trash2 class="w-4 h-4" />
          </button>

          <!-- Minimize button -->
          <button 
            type="button" 
            @click="emit('close')" 
            class="p-2 text-secondaryText hover:text-primaryText rounded-xl hover:bg-subtle transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Minimizar (sigue contando en segundo plano)"
          >
            <ChevronDown class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Discard Confirmation Banner -->
      <div 
        v-if="isConfirmingCancel" 
        class="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-in fade-in duration-150 space-y-2"
      >
        <div class="flex items-center gap-2 text-xs font-bold text-rose-500">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>¿Descartar esta toma sin guardar?</span>
        </div>
        <p class="text-[11px] text-mutedText leading-relaxed">
          Se perderá el tiempo transcurrido ({{ formatSeconds(totalSeconds) }}). Si solo querés seguir usando la app, podés minimizarla.
        </p>
        <div class="flex gap-2 pt-1">
          <button 
            type="button" 
            @click="isConfirmingCancel = false"
            class="flex-1 py-1.5 rounded-xl bg-subtle text-secondaryText text-xs font-bold hover:bg-borderSubtle transition-all"
          >
            Seguir registrando
          </button>
          <button 
            type="button" 
            @click="handleConfirmCancel"
            class="flex-1 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all"
          >
            Sí, descartar
          </button>
        </div>
      </div>

      <!-- Total Duration Clock -->
      <div class="text-center my-4">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-mutedText">Duración Total de la Sesión</span>
        <div class="text-5xl font-black font-mono tracking-tight text-primaryText tabular-nums mt-1">
          {{ formatSeconds(totalSeconds) }}
        </div>
      </div>

      <!-- 4-Way Mode Controls Grid -->
      <div class="grid grid-cols-2 gap-2.5 mb-4">
        <!-- 1. Left Breast Control -->
        <button
          type="button"
          @click="session.activeSide === 'left' ? emit('pause') : emit('switch-mode', 'left')"
          class="p-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden active:scale-[0.98]"
          :class="session.activeSide === 'left' 
            ? 'bg-breastLeft-soft border-breastLeft text-primaryText shadow-md ring-2 ring-breastLeft/30' 
            : 'bg-subtle border-borderSubtle text-secondaryText hover:border-breastLeft-border'"
        >
          <div class="flex items-center gap-1 text-breastLeft mb-0.5">
            <Baby class="w-3.5 h-3.5" />
            <span class="text-[11px] font-bold uppercase tracking-wider">Pecho Izq.</span>
          </div>
          <span class="text-xl font-black font-mono my-0.5 tabular-nums">{{ formatSeconds(session.leftSeconds) }}</span>
          <span class="text-[10px] font-semibold flex items-center gap-1" :class="session.activeSide === 'left' ? 'text-breastLeft' : 'text-mutedText'">
            <span v-if="session.activeSide === 'left'" class="w-1.5 h-1.5 rounded-full bg-breastLeft animate-pulse" />
            {{ session.activeSide === 'left' ? 'Grabando...' : 'Tocar para activar' }}
          </span>
        </button>

        <!-- 2. Right Breast Control -->
        <button
          type="button"
          @click="session.activeSide === 'right' ? emit('pause') : emit('switch-mode', 'right')"
          class="p-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden active:scale-[0.98]"
          :class="session.activeSide === 'right' 
            ? 'bg-breastRight-soft border-breastRight text-primaryText shadow-md ring-2 ring-breastRight/30' 
            : 'bg-subtle border-borderSubtle text-secondaryText hover:border-breastRight-border'"
        >
          <div class="flex items-center gap-1 text-breastRight mb-0.5">
            <Baby class="w-3.5 h-3.5" />
            <span class="text-[11px] font-bold uppercase tracking-wider">Pecho Der.</span>
          </div>
          <span class="text-xl font-black font-mono my-0.5 tabular-nums">{{ formatSeconds(session.rightSeconds) }}</span>
          <span class="text-[10px] font-semibold flex items-center gap-1" :class="session.activeSide === 'right' ? 'text-breastRight' : 'text-mutedText'">
            <span v-if="session.activeSide === 'right'" class="w-1.5 h-1.5 rounded-full bg-breastRight animate-pulse" />
            {{ session.activeSide === 'right' ? 'Grabando...' : 'Tocar para activar' }}
          </span>
        </button>

        <!-- 3. Maternal Bottle Control -->
        <button
          type="button"
          @click="session.activeSide === 'bottle_maternal' ? emit('pause') : emit('switch-mode', 'bottle_maternal')"
          class="p-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden active:scale-[0.98]"
          :class="session.activeSide === 'bottle_maternal' 
            ? 'bg-bottle-soft border-bottle text-primaryText shadow-md ring-2 ring-bottle/30' 
            : 'bg-subtle border-borderSubtle text-secondaryText hover:border-bottle-border'"
        >
          <div class="flex items-center gap-1 text-bottle mb-0.5">
            <Milk class="w-3.5 h-3.5" />
            <span class="text-[11px] font-bold uppercase tracking-wider">Bib. Materna</span>
          </div>
          <span class="text-xl font-black font-mono my-0.5 tabular-nums">{{ formatSeconds(session.bottleMaternalSeconds || 0) }}</span>
          <span class="text-[10px] font-semibold flex items-center gap-1" :class="session.activeSide === 'bottle_maternal' ? 'text-bottle' : 'text-mutedText'">
            <span v-if="session.activeSide === 'bottle_maternal'" class="w-1.5 h-1.5 rounded-full bg-bottle animate-pulse" />
            {{ session.activeSide === 'bottle_maternal' ? 'Grabando...' : 'Tocar para activar' }}
          </span>
        </button>

        <!-- 4. Formula Bottle Control -->
        <button
          type="button"
          @click="session.activeSide === 'bottle_formula' ? emit('pause') : emit('switch-mode', 'bottle_formula')"
          class="p-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden active:scale-[0.98]"
          :class="session.activeSide === 'bottle_formula' 
            ? 'bg-warningSoft-soft border-warningSoft text-primaryText shadow-md ring-2 ring-warningSoft/30' 
            : 'bg-subtle border-borderSubtle text-secondaryText hover:border-warningSoft-border'"
        >
          <div class="flex items-center gap-1 text-warningSoft mb-0.5">
            <Milk class="w-3.5 h-3.5" />
            <span class="text-[11px] font-bold uppercase tracking-wider">Bib. Fórmula</span>
          </div>
          <span class="text-xl font-black font-mono my-0.5 tabular-nums">{{ formatSeconds(session.bottleFormulaSeconds || 0) }}</span>
          <span class="text-[10px] font-semibold flex items-center gap-1" :class="session.activeSide === 'bottle_formula' ? 'text-warningSoft' : 'text-mutedText'">
            <span v-if="session.activeSide === 'bottle_formula'" class="w-1.5 h-1.5 rounded-full bg-warningSoft animate-pulse" />
            {{ session.activeSide === 'bottle_formula' ? 'Grabando...' : 'Tocar para activar' }}
          </span>
        </button>
      </div>

      <!-- Bottle Amount Inputs (Shown if bottle was used or active) -->
      <div class="p-3 rounded-2xl bg-subtle border border-borderSubtle space-y-2.5 mb-4">
        <span class="text-[11px] font-bold uppercase tracking-wider text-mutedText block">Cantidades de Biberón (ml)</span>
        
        <div class="grid grid-cols-2 gap-2">
          <!-- Maternal Bottle ml -->
          <div class="p-2 bg-surface rounded-xl border border-borderSubtle">
            <div class="flex items-center justify-between text-[10px] font-semibold text-bottle mb-1">
              <span>Leche Materna</span>
              <span class="font-mono">{{ session.amountMaternalMl || 0 }} ml</span>
            </div>
            <div class="flex items-center gap-1">
              <button 
                type="button" 
                @click="adjustMl('maternal', -10)" 
                class="px-2 py-0.5 bg-subtle rounded text-xs font-bold hover:bg-borderSubtle"
              >
                -10
              </button>
              <input
                type="number"
                :value="session.amountMaternalMl"
                @input="emit('set-bottle-amount', 'maternal', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)"
                placeholder="0"
                class="w-full text-center text-xs font-mono font-bold bg-transparent border-b border-borderSubtle py-0.5 focus:outline-none"
              />
              <button 
                type="button" 
                @click="adjustMl('maternal', 10)" 
                class="px-2 py-0.5 bg-subtle rounded text-xs font-bold hover:bg-borderSubtle"
              >
                +10
              </button>
            </div>
          </div>

          <!-- Formula Bottle ml -->
          <div class="p-2 bg-surface rounded-xl border border-borderSubtle">
            <div class="flex items-center justify-between text-[10px] font-semibold text-warningSoft mb-1">
              <span>Fórmula</span>
              <span class="font-mono">{{ session.amountFormulaMl || 0 }} ml</span>
            </div>
            <div class="flex items-center gap-1">
              <button 
                type="button" 
                @click="adjustMl('formula', -10)" 
                class="px-2 py-0.5 bg-subtle rounded text-xs font-bold hover:bg-borderSubtle"
              >
                -10
              </button>
              <input
                type="number"
                :value="session.amountFormulaMl"
                @input="emit('set-bottle-amount', 'formula', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)"
                placeholder="0"
                class="w-full text-center text-xs font-mono font-bold bg-transparent border-b border-borderSubtle py-0.5 focus:outline-none"
              />
              <button 
                type="button" 
                @click="adjustMl('formula', 10)" 
                class="px-2 py-0.5 bg-subtle rounded text-xs font-bold hover:bg-borderSubtle"
              >
                +10
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Field -->
      <div class="mb-5">
        <label class="block text-xs font-medium text-mutedText mb-1">Notas / Observaciones (opcional):</label>
        <input
          type="text"
          :value="session.notes"
          @input="emit('update:notes', ($event.target as HTMLInputElement).value)"
          placeholder="Ej. Tomó primero pecho y luego suplemento de fórmula..."
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
          @click="emit('resume', 'left')"
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

      <!-- Quick Hint -->
      <div class="mt-3 text-center">
        <button 
          type="button" 
          @click="emit('close')" 
          class="text-[11px] text-mutedText hover:text-primaryText underline transition-colors"
        >
          Minimizar y seguir navegando la app
        </button>
      </div>

    </div>
  </div>
</template>


