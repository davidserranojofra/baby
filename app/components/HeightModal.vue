<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, Check, Ruler, MessageSquare, Calendar, Loader2 } from 'lucide-vue-next';
import type { HeightLog, CreateHeightDTO, UpdateHeightDTO } from '~/types/baby-tracker';

const props = defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
  heightToEdit?: HeightLog | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit-create', payload: CreateHeightDTO): void;
  (e: 'submit-update', payload: UpdateHeightDTO): void;
}>();

const heightCm = ref<number>(50.0);
const recordedAtLocal = ref<string>('');
const notes = ref<string>('');

const isEditMode = computed(() => !!props.heightToEdit);

const formatCm = computed(() => {
  if (!heightCm.value || heightCm.value <= 0) return '0 cm';
  return `${heightCm.value.toFixed(1)} cm`;
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

const adjustHeight = (deltaCm: number) => {
  const current = heightCm.value || 50.0;
  const newHeight = Math.max(20, Math.min(200, current + deltaCm));
  heightCm.value = parseFloat(newHeight.toFixed(2));
};

const resetForm = () => {
  if (props.heightToEdit) {
    heightCm.value = Number(props.heightToEdit.height_cm);
    recordedAtLocal.value = toDateTimeLocal(new Date(props.heightToEdit.recorded_at));
    notes.value = props.heightToEdit.notes || '';
  } else {
    heightCm.value = 50.0;
    recordedAtLocal.value = toDateTimeLocal(new Date());
    notes.value = '';
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
  }
});

watch(() => props.heightToEdit, () => {
  if (props.isOpen) {
    resetForm();
  }
});

const handleSubmit = () => {
  if (!heightCm.value || heightCm.value <= 0 || !recordedAtLocal.value) return;

  const isoTimestamp = new Date(recordedAtLocal.value).toISOString();

  if (isEditMode.value && props.heightToEdit) {
    const payload: UpdateHeightDTO = {
      id: props.heightToEdit.id,
      height_cm: Number(heightCm.value),
      recorded_at: isoTimestamp,
      notes: notes.value.trim() || null
    };
    emit('submit-update', payload);
  } else {
    const payload: CreateHeightDTO = {
      height_cm: Number(heightCm.value),
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
          <div class="w-8 h-8 rounded-xl bg-height-soft flex items-center justify-center text-height border border-height-border">
            <Ruler class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-primaryText leading-none">
              {{ isEditMode ? 'Editar Control de Altura' : 'Nuevo Control de Altura' }}
            </h3>
            <span class="text-[11px] font-medium text-mutedText block mt-0.5">
              {{ isEditMode ? 'Modificar datos de la medición' : 'Registrar altura o longitud del bebé' }}
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
        
        <!-- Height Input (cm with helper & quick adjustment chips) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-mutedText uppercase tracking-wider">
              Altura / Talla del bebé
            </label>
            <span class="text-xs font-mono font-bold text-height px-2 py-0.5 rounded-full bg-height-soft border border-height-border">
              {{ formatCm }}
            </span>
          </div>

          <div class="relative">
            <input
              type="number"
              v-model.number="heightCm"
              step="0.1"
              min="20"
              max="200"
              required
              class="w-full px-4 py-3 text-2xl font-black font-mono text-center rounded-2xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-height/40 transition-all"
              placeholder="50.0"
            />
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-mutedText">
              cm
            </span>
          </div>

          <!-- Quick delta chips -->
          <div class="flex items-center justify-center gap-1.5 pt-1">
            <button
              type="button"
              @click="adjustHeight(-1.0)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              -1.0 cm
            </button>
            <button
              type="button"
              @click="adjustHeight(-0.5)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              -0.5 cm
            </button>
            <button
              type="button"
              @click="adjustHeight(0.5)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              +0.5 cm
            </button>
            <button
              type="button"
              @click="adjustHeight(1.0)"
              class="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText border border-borderSubtle active:scale-95 transition-all"
            >
              +1.0 cm
            </button>
          </div>
        </div>

        <!-- Date & Time of Measurement -->
        <div>
          <label class="block text-xs font-bold text-mutedText uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar class="w-3.5 h-3.5" />
            <span>Fecha y hora de la medición</span>
          </label>
          <input
            type="datetime-local"
            v-model="recordedAtLocal"
            required
            class="w-full px-3.5 py-2.5 text-xs font-mono font-medium rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-height/40 transition-all"
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
            placeholder="ej. Medido en la revisión de los 2 meses"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-height/40 transition-all"
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
            :disabled="isLoading || !heightCm || heightCm <= 0"
            class="flex-2 py-3 px-6 rounded-2xl bg-height hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <Check v-else class="w-4 h-4 stroke-[3]" />
            <span>{{ isEditMode ? 'Actualizar Altura' : 'Guardar Altura' }}</span>
          </button>
        </div>

      </form>

    </div>
  </div>
</template>
