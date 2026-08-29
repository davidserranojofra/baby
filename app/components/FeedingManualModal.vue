<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, Check, Baby, Milk, AlertCircle } from 'lucide-vue-next';
import type { CreateFeedingDTO, BreastSide } from '~/types/baby-tracker';

const props = defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: CreateFeedingDTO): void;
}>();

// Multi-select format flags
const useLeftBreast = ref<boolean>(true);
const useRightBreast = ref<boolean>(false);
const useMaternalBottle = ref<boolean>(false);
const useFormulaBottle = ref<boolean>(false);

// Format details
const durationLeftMinutes = ref<number>(15);
const durationRightMinutes = ref<number>(15);
const amountMaternalMl = ref<number>(60);
const amountFormulaMl = ref<number>(90);
const durationMaternalMinutes = ref<number>(10);
const durationFormulaMinutes = ref<number>(10);

const startedAtLocal = ref<string>('');
const notes = ref<string>('');
const formError = ref<string | null>(null);

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
    useLeftBreast.value = true;
    useRightBreast.value = false;
    useMaternalBottle.value = false;
    useFormulaBottle.value = false;
    durationLeftMinutes.value = 15;
    durationRightMinutes.value = 15;
    amountMaternalMl.value = 60;
    amountFormulaMl.value = 90;
    durationMaternalMinutes.value = 10;
    durationFormulaMinutes.value = 10;
    notes.value = '';
    formError.value = null;
  }
});

const isAnySelected = computed(() => {
  return useLeftBreast.value || useRightBreast.value || useMaternalBottle.value || useFormulaBottle.value;
});

const handleSubmit = () => {
  if (!isAnySelected.value) {
    formError.value = 'Selecciona al menos un formato (Pecho o Biberón)';
    return;
  }
  formError.value = null;

  const startDate = new Date(startedAtLocal.value);
  let leftSec = 0;
  let rightSec = 0;
  let maternalBottleSec = 0;
  let formulaBottleSec = 0;

  if (useLeftBreast.value) {
    leftSec = (durationLeftMinutes.value || 0) * 60;
  }
  if (useRightBreast.value) {
    rightSec = (durationRightMinutes.value || 0) * 60;
  }
  if (useMaternalBottle.value) {
    maternalBottleSec = (durationMaternalMinutes.value || 0) * 60;
  }
  if (useFormulaBottle.value) {
    formulaBottleSec = (durationFormulaMinutes.value || 0) * 60;
  }

  const bottleSec = maternalBottleSec + formulaBottleSec;
  const totalDurationSec = leftSec + rightSec + bottleSec;
  const endDate = new Date(startDate.getTime() + (totalDurationSec || 600) * 1000);

  const matMl = useMaternalBottle.value ? (amountMaternalMl.value || 0) : 0;
  const formMl = useFormulaBottle.value ? (amountFormulaMl.value || 0) : 0;
  const totalMl = matMl + formMl;

  const hasBreast = useLeftBreast.value || useRightBreast.value;
  const hasBottle = useMaternalBottle.value || useFormulaBottle.value;

  let breastSide: BreastSide | null = null;
  if (useLeftBreast.value && useRightBreast.value) breastSide = 'both';
  else if (useLeftBreast.value) breastSide = 'left';
  else if (useRightBreast.value) breastSide = 'right';

  // Build tags for notes
  const tags: string[] = [];
  if (useMaternalBottle.value) tags.push(`Materna: ${matMl}ml`);
  if (useFormulaBottle.value) tags.push(`Fórmula: ${formMl}ml`);
  if (hasBreast && hasBottle) tags.push('Combinada');

  let combinedNotes = notes.value.trim();
  if (tags.length > 0) {
    const tagStr = `[${tags.join(' | ')}]`;
    combinedNotes = combinedNotes ? `${tagStr} ${combinedNotes}` : tagStr;
  }

  const payload: CreateFeedingDTO = {
    feeding_type: hasBreast ? 'breast' : 'bottle',
    breast_side: breastSide,
    started_at: startDate.toISOString(),
    ended_at: endDate.toISOString(),
    duration_seconds: totalDurationSec || (bottleSec > 0 ? bottleSec : 600),
    duration_left_seconds: leftSec,
    duration_right_seconds: rightSec,
    amount_ml: totalMl > 0 ? totalMl : null,
    amount_maternal_ml: useMaternalBottle.value ? matMl : null,
    amount_formula_ml: useFormulaBottle.value ? formMl : null,
    notes: combinedNotes || null
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
        <div>
          <h3 class="text-base font-extrabold text-primaryText">Registrar Toma Manual</h3>
          <p class="text-[11px] text-mutedText">Combiná pecho y biberón libremente</p>
        </div>
        <button 
          type="button" 
          @click="emit('close')" 
          class="p-1.5 text-mutedText hover:text-primaryText rounded-full hover:bg-subtle"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Error Banner if no selection -->
        <div v-if="formError" class="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 flex items-center gap-1.5 font-bold">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ formError }}</span>
        </div>

        <!-- 4 Combinable Formats Grid -->
        <div>
          <label class="block text-xs font-bold text-mutedText uppercase tracking-wider mb-2">Formatos Utilizados (Combinables)</label>
          
          <div class="grid grid-cols-2 gap-2">
            <!-- 1. Pecho Izquierdo Checkbox Card -->
            <div 
              @click="useLeftBreast = !useLeftBreast"
              class="p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
              :class="useLeftBreast ? 'bg-breastLeft-soft border-breastLeft text-primaryText ring-2 ring-breastLeft/20' : 'bg-subtle border-borderSubtle text-mutedText opacity-75'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5">
                  <Baby class="w-4 h-4 text-breastLeft" />
                  <span class="text-xs font-bold">Pecho Izq.</span>
                </div>
                <input 
                  type="checkbox" 
                  :checked="useLeftBreast" 
                  class="rounded accent-breastLeft w-4 h-4 cursor-pointer" 
                  @click.stop="useLeftBreast = !useLeftBreast" 
                />
              </div>
              <div v-if="useLeftBreast" class="mt-1" @click.stop>
                <div class="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-borderSubtle">
                  <input
                    type="number"
                    v-model.number="durationLeftMinutes"
                    min="1"
                    max="120"
                    class="w-full text-center text-xs font-mono font-bold bg-transparent focus:outline-none"
                  />
                  <span class="text-[10px] text-mutedText pr-1">min</span>
                </div>
              </div>
            </div>

            <!-- 2. Pecho Derecho Checkbox Card -->
            <div 
              @click="useRightBreast = !useRightBreast"
              class="p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
              :class="useRightBreast ? 'bg-breastRight-soft border-breastRight text-primaryText ring-2 ring-breastRight/20' : 'bg-subtle border-borderSubtle text-mutedText opacity-75'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5">
                  <Baby class="w-4 h-4 text-breastRight" />
                  <span class="text-xs font-bold">Pecho Der.</span>
                </div>
                <input 
                  type="checkbox" 
                  :checked="useRightBreast" 
                  class="rounded accent-breastRight w-4 h-4 cursor-pointer" 
                  @click.stop="useRightBreast = !useRightBreast" 
                />
              </div>
              <div v-if="useRightBreast" class="mt-1" @click.stop>
                <div class="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-borderSubtle">
                  <input
                    type="number"
                    v-model.number="durationRightMinutes"
                    min="1"
                    max="120"
                    class="w-full text-center text-xs font-mono font-bold bg-transparent focus:outline-none"
                  />
                  <span class="text-[10px] text-mutedText pr-1">min</span>
                </div>
              </div>
            </div>

            <!-- 3. Biberón Leche Materna Card -->
            <div 
              @click="useMaternalBottle = !useMaternalBottle"
              class="p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
              :class="useMaternalBottle ? 'bg-bottle-soft border-bottle text-primaryText ring-2 ring-bottle/20' : 'bg-subtle border-borderSubtle text-mutedText opacity-75'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5">
                  <Milk class="w-4 h-4 text-bottle" />
                  <span class="text-xs font-bold">Bib. Materna</span>
                </div>
                <input 
                  type="checkbox" 
                  :checked="useMaternalBottle" 
                  class="rounded accent-bottle w-4 h-4 cursor-pointer" 
                  @click.stop="useMaternalBottle = !useMaternalBottle" 
                />
              </div>
              <div v-if="useMaternalBottle" class="mt-1" @click.stop>
                <div class="grid grid-cols-2 gap-1.5">
                  <div class="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-borderSubtle">
                    <input
                      type="number"
                      v-model.number="amountMaternalMl"
                      min="5"
                      max="500"
                      step="5"
                      class="w-full text-center text-xs font-mono font-bold bg-transparent focus:outline-none"
                    />
                    <span class="text-[10px] text-mutedText pr-0.5">ml</span>
                  </div>
                  <div class="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-borderSubtle">
                    <input
                      type="number"
                      v-model.number="durationMaternalMinutes"
                      min="1"
                      max="120"
                      class="w-full text-center text-xs font-mono font-bold bg-transparent focus:outline-none"
                    />
                    <span class="text-[10px] text-mutedText pr-0.5">min</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Biberón Fórmula Card -->
            <div 
              @click="useFormulaBottle = !useFormulaBottle"
              class="p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
              :class="useFormulaBottle ? 'bg-warningSoft-soft border-warningSoft text-primaryText ring-2 ring-warningSoft/20' : 'bg-subtle border-borderSubtle text-mutedText opacity-75'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5">
                  <Milk class="w-4 h-4 text-warningSoft" />
                  <span class="text-xs font-bold">Bib. Fórmula</span>
                </div>
                <input 
                  type="checkbox" 
                  :checked="useFormulaBottle" 
                  class="rounded accent-warningSoft w-4 h-4 cursor-pointer" 
                  @click.stop="useFormulaBottle = !useFormulaBottle" 
                />
              </div>
              <div v-if="useFormulaBottle" class="mt-1" @click.stop>
                <div class="grid grid-cols-2 gap-1.5">
                  <div class="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-borderSubtle">
                    <input
                      type="number"
                      v-model.number="amountFormulaMl"
                      min="5"
                      max="500"
                      step="5"
                      class="w-full text-center text-xs font-mono font-bold bg-transparent focus:outline-none"
                    />
                    <span class="text-[10px] text-mutedText pr-0.5">ml</span>
                  </div>
                  <div class="flex items-center gap-1 bg-surface p-1.5 rounded-xl border border-borderSubtle">
                    <input
                      type="number"
                      v-model.number="durationFormulaMinutes"
                      min="1"
                      max="120"
                      class="w-full text-center text-xs font-mono font-bold bg-transparent focus:outline-none"
                    />
                    <span class="text-[10px] text-mutedText pr-0.5">min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Start Time -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Fecha y Hora de la Toma</label>
          <input
            type="datetime-local"
            v-model="startedAtLocal"
            required
            class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-breastLeft/40 font-mono"
          />
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Notas / Observaciones</label>
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Ej. Pecho derecho 15 min + suplemento 60ml de fórmula..."
            class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-breastLeft/40 resize-none"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading || !isAnySelected"
            class="w-full py-3 rounded-2xl bg-primaryText text-surface font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm"
          >
            <Check class="w-4 h-4 stroke-[3]" />
            <span>{{ isLoading ? 'Guardando...' : 'Guardar Registro Combinado' }}</span>
          </button>
        </div>
      </form>

    </div>
  </div>
</template>

