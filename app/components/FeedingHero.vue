<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Clock, Play, Pause, Plus, Baby, Sparkles, ArrowRightLeft, Check, Maximize2, Milk, Droplets } from 'lucide-vue-next';
import type { Feeding, ActiveFeedingSession, ActiveFeedingSide, BottleMilkType } from '~/types/baby-tracker';

const props = defineProps<{
  lastFeeding: Feeding | null;
  activeSession?: ActiveFeedingSession;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'start-breast', side: 'left' | 'right'): void;
  (e: 'start-bottle', milkType: 'maternal' | 'formula'): void;
  (e: 'open-manual'): void;
  (e: 'open-active-modal'): void;
  (e: 'switch-side', side: 'left' | 'right'): void;
  (e: 'switch-mode', mode: ActiveFeedingSide): void;
  (e: 'pause-feeding'): void;
  (e: 'resume-feeding', mode?: ActiveFeedingSide): void;
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
  return (
    props.activeSession.leftSeconds +
    props.activeSession.rightSeconds +
    (props.activeSession.bottleMaternalSeconds || 0) +
    (props.activeSession.bottleFormulaSeconds || 0)
  );
});

const activeModeTitle = computed(() => {
  if (!props.activeSession || !props.activeSession.activeSide) return 'Toma en Pausa';
  switch (props.activeSession.activeSide) {
    case 'left': return 'Pecho Izquierdo Activo';
    case 'right': return 'Pecho Derecho Activo';
    case 'bottle_maternal': return 'Biberón Materna Activo';
    case 'bottle_formula': return 'Biberón Fórmula Activo';
    default: return 'Toma en Curso';
  }
});

const lastFeedingLabel = computed(() => {
  if (!props.lastFeeding) return 'Sin registros previos';
  const notes = props.lastFeeding.notes || '';
  if (notes.includes('Combinada')) {
    return 'Toma Combinada (Pecho + Bib.)';
  }
  if (props.lastFeeding.feeding_type === 'bottle' || props.lastFeeding.amount_ml) {
    const isMaternal = notes.includes('Materna');
    const typeStr = isMaternal ? 'Bib. Materna' : 'Bib. Fórmula';
    return `${typeStr} (${props.lastFeeding.amount_ml || 0} ml)`;
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
            :class="{
              'bg-breastLeft-soft text-breastLeft': activeSession.activeSide === 'left',
              'bg-breastRight-soft text-breastRight': activeSession.activeSide === 'right',
              'bg-bottle-soft text-bottle': activeSession.activeSide === 'bottle_maternal',
              'bg-warningSoft-soft text-warningSoft': activeSession.activeSide === 'bottle_formula',
              'bg-subtle text-mutedText': !activeSession.activeSide
            }"
          >
            <Baby v-if="activeSession.activeSide === 'left' || activeSession.activeSide === 'right'" class="w-4 h-4" />
            <Milk v-else-if="activeSession.activeSide === 'bottle_maternal' || activeSession.activeSide === 'bottle_formula'" class="w-4 h-4" />
            <Baby v-else class="w-4 h-4" />
            
            <span 
              v-if="activeSession.activeSide" 
              class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface animate-pulse"
              :class="{
                'bg-breastLeft': activeSession.activeSide === 'left',
                'bg-breastRight': activeSession.activeSide === 'right',
                'bg-bottle': activeSession.activeSide === 'bottle_maternal',
                'bg-warningSoft': activeSession.activeSide === 'bottle_formula'
              }" 
            />
          </div>
          <div>
            <h2 class="text-xs font-bold uppercase tracking-wider text-primaryText">Toma en Curso</h2>
            <p class="text-sm font-extrabold text-primaryText">
              {{ activeModeTitle }}
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

      <!-- Live Total Duration Clock -->
      <div class="py-4 px-3 bg-subtle rounded-2xl border border-borderSubtle">
        <div class="text-center mb-3">
          <span class="text-[11px] font-semibold text-mutedText uppercase tracking-wider block">Duración Total</span>
          <span class="text-4xl font-black font-mono tracking-tight text-primaryText tabular-nums block mt-0.5">
            {{ formatSeconds(totalFeedingSeconds) }}
          </span>
        </div>

        <!-- 4 Modes Multi-Status Grid -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Left Breast -->
          <button
            type="button"
            @click="activeSession.activeSide === 'left' ? emit('pause-feeding') : emit('switch-mode', 'left')"
            class="p-2.5 rounded-xl border text-center transition-all active:scale-[0.98]"
            :class="activeSession.activeSide === 'left' ? 'bg-breastLeft-soft border-breastLeft text-breastLeft ring-2 ring-breastLeft/30' : 'bg-surface border-borderSubtle text-mutedText hover:border-breastLeft-border'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider block">Pecho Izq.</span>
            <span class="text-base font-black font-mono tabular-nums block mt-0.5 text-primaryText">{{ formatSeconds(activeSession.leftSeconds) }}</span>
            <span class="text-[9px] font-semibold block mt-0.5" :class="activeSession.activeSide === 'left' ? 'text-breastLeft' : 'text-mutedText'">
              {{ activeSession.activeSide === 'left' ? '● Activo' : 'Tocar para activar' }}
            </span>
          </button>

          <!-- Right Breast -->
          <button
            type="button"
            @click="activeSession.activeSide === 'right' ? emit('pause-feeding') : emit('switch-mode', 'right')"
            class="p-2.5 rounded-xl border text-center transition-all active:scale-[0.98]"
            :class="activeSession.activeSide === 'right' ? 'bg-breastRight-soft border-breastRight text-breastRight ring-2 ring-breastRight/30' : 'bg-surface border-borderSubtle text-mutedText hover:border-breastRight-border'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider block">Pecho Der.</span>
            <span class="text-base font-black font-mono tabular-nums block mt-0.5 text-primaryText">{{ formatSeconds(activeSession.rightSeconds) }}</span>
            <span class="text-[9px] font-semibold block mt-0.5" :class="activeSession.activeSide === 'right' ? 'text-breastRight' : 'text-mutedText'">
              {{ activeSession.activeSide === 'right' ? '● Activo' : 'Tocar para activar' }}
            </span>
          </button>

          <!-- Bottle Maternal -->
          <button
            type="button"
            @click="activeSession.activeSide === 'bottle_maternal' ? emit('pause-feeding') : emit('switch-mode', 'bottle_maternal')"
            class="p-2.5 rounded-xl border text-center transition-all active:scale-[0.98]"
            :class="activeSession.activeSide === 'bottle_maternal' ? 'bg-bottle-soft border-bottle text-bottle ring-2 ring-bottle/30' : 'bg-surface border-borderSubtle text-mutedText hover:border-bottle-border'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider block">Bib. Materna</span>
            <span class="text-base font-black font-mono tabular-nums block mt-0.5 text-primaryText">{{ formatSeconds(activeSession.bottleMaternalSeconds || 0) }}</span>
            <span class="text-[9px] font-semibold block mt-0.5" :class="activeSession.activeSide === 'bottle_maternal' ? 'text-bottle' : 'text-mutedText'">
              {{ activeSession.activeSide === 'bottle_maternal' ? '● Activo' : 'Tocar para activar' }}
            </span>
          </button>

          <!-- Bottle Formula -->
          <button
            type="button"
            @click="activeSession.activeSide === 'bottle_formula' ? emit('pause-feeding') : emit('switch-mode', 'bottle_formula')"
            class="p-2.5 rounded-xl border text-center transition-all active:scale-[0.98]"
            :class="activeSession.activeSide === 'bottle_formula' ? 'bg-warningSoft-soft border-warningSoft text-warningSoft ring-2 ring-warningSoft/30' : 'bg-surface border-borderSubtle text-mutedText hover:border-warningSoft-border'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider block">Bib. Fórmula</span>
            <span class="text-base font-black font-mono tabular-nums block mt-0.5 text-primaryText">{{ formatSeconds(activeSession.bottleFormulaSeconds || 0) }}</span>
            <span class="text-[9px] font-semibold block mt-0.5" :class="activeSession.activeSide === 'bottle_formula' ? 'text-warningSoft' : 'text-mutedText'">
              {{ activeSession.activeSide === 'bottle_formula' ? '● Activo' : 'Tocar para activar' }}
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
          @click="emit('resume-feeding', 'left')"
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
    <div v-else class="space-y-4">
      <!-- Header Status -->
      <div class="flex items-center justify-between">
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

      <!-- 4 Formats Ergonomic 2x2 Action Grid -->
      <div>
        <span class="text-[11px] font-bold text-mutedText uppercase tracking-wider block mb-2">Iniciar Toma Rápida</span>
        <div class="grid grid-cols-2 gap-2.5">
          <!-- 1. Left Breast Quick Start -->
          <button
            type="button"
            @click="emit('start-breast', 'left')"
            class="flex flex-col items-center justify-center p-3 rounded-2xl bg-breastLeft-soft border-2 border-breastLeft-border text-primaryText active:scale-[0.98] transition-all shadow-soft-xs hover:opacity-95 text-center"
          >
            <div class="w-8 h-8 rounded-full bg-breastLeft text-white flex items-center justify-center mb-1 shadow-sm">
              <Baby class="w-4 h-4" />
            </div>
            <span class="text-xs font-extrabold text-primaryText">Pecho Izq.</span>
            <span class="text-[10px] text-mutedText">Cronometrar</span>
          </button>

          <!-- 2. Right Breast Quick Start -->
          <button
            type="button"
            @click="emit('start-breast', 'right')"
            class="flex flex-col items-center justify-center p-3 rounded-2xl bg-breastRight-soft border-2 border-breastRight-border text-primaryText active:scale-[0.98] transition-all shadow-soft-xs hover:opacity-95 text-center"
          >
            <div class="w-8 h-8 rounded-full bg-breastRight text-white flex items-center justify-center mb-1 shadow-sm">
              <Baby class="w-4 h-4" />
            </div>
            <span class="text-xs font-extrabold text-primaryText">Pecho Der.</span>
            <span class="text-[10px] text-mutedText">Cronometrar</span>
          </button>

          <!-- 3. Maternal Bottle Quick Start -->
          <button
            type="button"
            @click="emit('start-bottle', 'maternal')"
            class="flex flex-col items-center justify-center p-3 rounded-2xl bg-bottle-soft border-2 border-bottle-border text-primaryText active:scale-[0.98] transition-all shadow-soft-xs hover:opacity-95 text-center"
          >
            <div class="w-8 h-8 rounded-full bg-bottle text-white flex items-center justify-center mb-1 shadow-sm">
              <Milk class="w-4 h-4" />
            </div>
            <span class="text-xs font-extrabold text-primaryText">Bib. Materna</span>
            <span class="text-[10px] text-mutedText">Leche materna</span>
          </button>

          <!-- 4. Formula Bottle Quick Start -->
          <button
            type="button"
            @click="emit('start-bottle', 'formula')"
            class="flex flex-col items-center justify-center p-3 rounded-2xl bg-warningSoft-soft border-2 border-warningSoft-border text-primaryText active:scale-[0.98] transition-all shadow-soft-xs hover:opacity-95 text-center"
          >
            <div class="w-8 h-8 rounded-full bg-warningSoft text-white flex items-center justify-center mb-1 shadow-sm">
              <Milk class="w-4 h-4" />
            </div>
            <span class="text-xs font-extrabold text-primaryText">Bib. Fórmula</span>
            <span class="text-[10px] text-mutedText">Fórmula infantil</span>
          </button>
        </div>
      </div>

      <!-- Manual / Combined Register Button -->
      <button
        type="button"
        @click="emit('open-manual')"
        class="w-full py-2.5 px-4 rounded-xl bg-subtle border border-borderSubtle text-secondaryText hover:text-primaryText text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Registrar toma manual o combinada</span>
      </button>
    </div>

  </section>
</template>
