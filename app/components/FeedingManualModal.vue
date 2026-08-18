<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Check, Baby, Milk } from 'lucide-vue-next';
import type { CreateFeedingDTO, FeedingType, BreastSide } from '~/types/baby-tracker';

const props = defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: CreateFeedingDTO): void;
}>();

const feedingType = ref<FeedingType>('breast');
const breastSide = ref<BreastSide>('left');
const startedAtLocal = ref<string>('');
const durationMinutes = ref<number>(15);
const durationLeftMinutes = ref<number>(10);
const durationRightMinutes = ref<number>(10);
const amountMl = ref<number>(90);
const notes = ref<string>('');

// Format local datetime input (YYYY-MM-DDTHH:MM)
const initDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  startedAtLocal.value = `${year}-${month}-${day}T${hours}:${minutes}`;
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    initDateTime();
    notes.value = '';
  }
});

const handleSubmit = () => {
  const startDate = new Date(startedAtLocal.value);
  let totalDurationSec = 0;
  let leftSec = 0;
  let rightSec = 0;

  if (feedingType.value === 'breast') {
    if (breastSide.value === 'both') {
      leftSec = (durationLeftMinutes.value || 0) * 60;
      rightSec = (durationRightMinutes.value || 0) * 60;
      totalDurationSec = leftSec + rightSec;
    } else {
      totalDurationSec = (durationMinutes.value || 0) * 60;
      if (breastSide.value === 'left') leftSec = totalDurationSec;
      if (breastSide.value === 'right') rightSec = totalDurationSec;
    }
  } else {
    totalDurationSec = (durationMinutes.value || 0) * 60;
  }

  const endDate = new Date(startDate.getTime() + totalDurationSec * 1000);

  const payload: CreateFeedingDTO = {
    feeding_type: feedingType.value,
    breast_side: feedingType.value === 'breast' ? breastSide.value : null,
    started_at: startDate.toISOString(),
    ended_at: endDate.toISOString(),
    duration_seconds: totalDurationSec,
    duration_left_seconds: leftSec,
    duration_right_seconds: rightSec,
    amount_ml: feedingType.value === 'bottle' ? amountMl.value : null,
    notes: notes.value.trim() || null
  };

  emit('submit', payload);
};
</script>

<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all"
  >
    <div class="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-soft-lg border border-borderSubtle max-h-[90vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-borderSubtle mb-4">
        <h3 class="text-base font-bold text-primaryText">Registrar Toma Retroactiva</h3>
        <button 
          type="button" 
          @click="emit('close')" 
          class="p-1.5 text-mutedText hover:text-primaryText rounded-full hover:bg-subtle"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Type Selection Toggle -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1.5">Tipo de Toma</label>
          <div class="grid grid-cols-2 gap-2 bg-subtle p-1 rounded-2xl border border-borderSubtle">
            <button
              type="button"
              @click="feedingType = 'breast'"
              class="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              :class="feedingType === 'breast' ? 'bg-surface text-primaryText shadow-sm' : 'text-mutedText'"
            >
              <Baby class="w-3.5 h-3.5" />
              <span>Pecho</span>
            </button>
            <button
              type="button"
              @click="feedingType = 'bottle'"
              class="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              :class="feedingType === 'bottle' ? 'bg-surface text-primaryText shadow-sm' : 'text-mutedText'"
            >
              <Milk class="w-3.5 h-3.5" />
              <span>Biberón / Fórmula</span>
            </button>
          </div>
        </div>

        <!-- Breast Options -->
        <div v-if="feedingType === 'breast'">
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1.5">Pecho Utilizado</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="breastSide = 'left'"
              class="py-2 px-2 rounded-xl text-xs font-bold border transition-all"
              :class="breastSide === 'left' ? 'bg-breastLeft-soft border-breastLeft text-primaryText' : 'bg-subtle border-borderSubtle text-mutedText'"
            >
              Izquierdo
            </button>
            <button
              type="button"
              @click="breastSide = 'right'"
              class="py-2 px-2 rounded-xl text-xs font-bold border transition-all"
              :class="breastSide === 'right' ? 'bg-breastRight-soft border-breastRight text-primaryText' : 'bg-subtle border-borderSubtle text-mutedText'"
            >
              Derecho
            </button>
            <button
              type="button"
              @click="breastSide = 'both'"
              class="py-2 px-2 rounded-xl text-xs font-bold border transition-all"
              :class="breastSide === 'both' ? 'bg-bottle-soft border-bottle text-primaryText' : 'bg-subtle border-borderSubtle text-mutedText'"
            >
              Ambos
            </button>
          </div>
        </div>

        <!-- Start Time -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Fecha y Hora de Inicio</label>
          <input
            type="datetime-local"
            v-model="startedAtLocal"
            required
            class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-breastLeft/40 font-mono"
          />
        </div>

        <!-- Durations -->
        <div v-if="feedingType === 'breast' && breastSide === 'both'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-medium text-mutedText mb-1">Minutos Pecho Izq.</label>
            <input
              type="number"
              v-model.number="durationLeftMinutes"
              min="1"
              max="120"
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono"
            />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-mutedText mb-1">Minutos Pecho Der.</label>
            <input
              type="number"
              v-model.number="durationRightMinutes"
              min="1"
              max="120"
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono"
            />
          </div>
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-medium text-mutedText mb-1">Duración (minutos)</label>
            <input
              type="number"
              v-model.number="durationMinutes"
              min="1"
              max="180"
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono"
            />
          </div>
          <div v-if="feedingType === 'bottle'">
            <label class="block text-[11px] font-medium text-mutedText mb-1">Cantidad (ml)</label>
            <input
              type="number"
              v-model.number="amountMl"
              min="5"
              max="500"
              step="5"
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono"
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Notas / Observaciones</label>
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Detalles sobre la toma..."
            class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-breastLeft/40 resize-none"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 rounded-2xl bg-primaryText text-surface font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm"
          >
            <Check class="w-4 h-4 stroke-[3]" />
            <span>{{ isLoading ? 'Guardando...' : 'Guardar Registro' }}</span>
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
