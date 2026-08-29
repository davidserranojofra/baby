<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, Check, Scale, MessageSquare, Calendar, Loader2 } from 'lucide-vue-next';
import type { WeightLog, CreateWeightDTO, UpdateWeightDTO } from '~/types/baby-tracker';

const props = defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
  weightToEdit?: WeightLog | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit-create', payload: CreateWeightDTO): void;
  (e: 'submit-update', payload: UpdateWeightDTO): void;
}>();

const weightKg = ref<number>(3.500);
const recordedAtLocal = ref<string>('');
const notes = ref<string>('');

const isEditMode = computed(() => !!props.weightToEdit);

const formatGrams = computed(() => {
  if (!weightKg.value || weightKg.value <= 0) return '0 g';
  return `${Math.round(weightKg.value * 1000)} g`;
});

// Convert Date object to datetime-local string YYYY-MM-DDTHH:mm
const toDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const adjustWeight = (deltaGrams: number) => {
  const currentGrams = Math.round((weightKg.value || 3.5) * 1000);
  const newGrams = Math.max(500, Math.min(30000, currentGrams + deltaGrams));
  weightKg.value = parseFloat((newGrams / 1000).toFixed(3));
};

const resetForm = () => {
  if (props.weightToEdit) {
    weightKg.value = Number(props.weightToEdit.weight_kg);
    recordedAtLocal.value = toDateTimeLocal(new Date(props.weightToEdit.recorded_at));
    notes.value = props.weightToEdit.notes || '';
  } else {
    weightKg.value = 3.500;
    recordedAtLocal.value = toDateTimeLocal(new Date());
    notes.value = '';
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
  }
});

watch(() => props.weightToEdit, () => {
  if (props.isOpen) {
    resetForm();
  }
});

const handleSubmit = () => {
  if (!weightKg.value || weightKg.value <= 0 || !recordedAtLocal.value) return;

  const isoTimestamp = new Date(recordedAtLocal.value).toISOString();

  if (isEditMode.value && props.weightToEdit) {
    const payload: UpdateWeightDTO = {
      id: props.weightToEdit.id,
      weight_kg: Number(weightKg.value),
      recorded_at: isoTimestamp,
      notes: notes.value.trim() || null
    };
    emit('submit-update', payload);
  } else {
    const payload: CreateWeightDTO = {
      weight_kg: Number(weightKg.value),
      recorded_at: isoTimestamp,
      notes: notes.value.trim() || null
    };
    emit('submit-create', payload);
  }
};
</script>

<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-soft-lg border border-borderSubtle max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-borderSubtle mb-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-weight-soft flex items-center justify-center text-weight border border-weight-border">
            <Scale class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-primaryText leading-none">
              {{ isEditMode ? 'Editar Control de Peso' : 'Nuevo Control de Peso' }}
            </h3>
            <span class="text-[11px] font-medium text-mutedText block mt-0.5">
              {{ isEditMode ? 'Modificar datos del pesaje' : 'Registrar pesaje del bebé' }}
            </span>
          </div>
        </div>

        <button 
          type="button" 
          @click="emit('close')" 
          class="p-2 text-mutedText hover:text-primaryText rounded-full hover:bg-subtle transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        
        <!-- Weight Input (kg with grams helper & quick adjustment chips) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-mutedText uppercase tracking-wider">
              Peso del bebé
            </label>
            <span class="text-xs font-mono font-bold text-weight px-2 py-0.5 rounded-full bg-weight-soft border border-weight-border">
              {{ formatGrams }}
            </span>
          </div>

          <div class="relative">
            <input
              type="number"
              v-model.number="weightKg"
              step="0.005"
              min="0.5"
              max="35"
              required
              class="w-full px-4 py-3 text-2xl font-black font-mono text-center rounded-2xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-weight/40 transition-all"
              placeholder="3.500"
            />
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-mutedText">
              kg
            </span>
          </div>

          <!-- Quick delta chips -->
          <div class="flex items-center justify-center gap-1.5 pt-1">
            <button
              type="button"
              @click="adjustWeight(-100)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              -100g
            </button>
            <button
              type="button"
              @click="adjustWeight(-20)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              -20g
            </button>
            <button
              type="button"
              @click="adjustWeight(20)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              +20g
            </button>
            <button
              type="button"
              @click="adjustWeight(100)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              +100g
            </button>
          </div>
        </div>

        <!-- Date & Time of Weigh-in -->
        <div>
          <label class="block text-xs font-bold text-mutedText uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar class="w-3.5 h-3.5" />
            <span>Fecha y hora del pesaje</span>
          </label>
          <input
            type="datetime-local"
            v-model="recordedAtLocal"
            required
            class="w-full px-3.5 py-2.5 text-xs font-mono font-medium rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-weight/40 transition-all"
          />
        </div>

        <!-- Optional Description / Notes -->
        <div>
          <label class="block text-xs font-bold text-mutedText uppercase tracking-wider mb-1 flex items-center gap-1">
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Descripción / Notas (opcional)</span>
          </label>
          <input
            type="text"
            v-model="notes"
            placeholder="ej. Pesado en el hospital por el pediatra"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-weight/40 transition-all"
          />
        </div>

        <!-- Submit Buttons -->
        <div class="pt-2 flex gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="flex-1 py-3 rounded-2xl bg-subtle text-secondaryText font-bold text-xs hover:bg-borderSubtle transition-all"
          >
            Cancelar
          </button>

          <button
            type="submit"
            :disabled="isLoading || !weightKg || weightKg <= 0"
            class="flex-2 py-3 px-6 rounded-2xl bg-weight hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <Check v-else class="w-4 h-4 stroke-[3]" />
            <span>{{ isEditMode ? 'Actualizar Peso' : 'Guardar Peso' }}</span>
          </button>
        </div>

      </form>

    </div>
  </div>
</template>
