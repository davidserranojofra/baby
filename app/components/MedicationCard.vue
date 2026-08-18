<script setup lang="ts">
import { ref } from 'vue';
import { Pill, Check, Plus, AlertCircle, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-vue-next';
import type { MedicationWithStatus, CreateMedicationDTO } from '~/types/baby-tracker';

const props = defineProps<{
  medications: MedicationWithStatus[];
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'log-dose', medicationId: string): void;
  (e: 'create-medication', dto: CreateMedicationDTO): void;
  (e: 'delete-medication', medicationId: string): void;
}>();

const isAddModalOpen = ref<boolean>(false);
const newMedName = ref<string>('');
const newMedDose = ref<string>('');
const newMedInterval = ref<number>(24);
const newMedNotes = ref<string>('');

const handleCreateMed = () => {
  if (!newMedName.value.trim()) return;
  emit('create-medication', {
    name: newMedName.value.trim(),
    dose_description: newMedDose.value.trim() || null,
    interval_hours: newMedInterval.value || 24,
    notes: newMedNotes.value.trim() || null
  });
  isAddModalOpen.value = false;
  newMedName.value = '';
  newMedDose.value = '';
  newMedNotes.value = '';
};

const formatTimeAgo = (hours: number | null | undefined) => {
  if (hours === null || hours === undefined) return 'Nunca administrado';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `Hace ${mins} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `Hace ${h}h ${m > 0 ? `${m}m` : ''}`;
};
</script>

<template>
  <section class="w-full bg-surface rounded-3xl p-5 shadow-soft-md border border-borderSubtle transition-all">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-meds-soft flex items-center justify-center text-meds">
          <Pill class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-mutedText">Medicación y Cuidados</h2>
          <p class="text-sm font-bold text-primaryText">Dosis e Intervalos</p>
        </div>
      </div>

      <button
        type="button"
        @click="isAddModalOpen = true"
        class="p-1.5 rounded-full bg-subtle hover:bg-borderSubtle text-secondaryText hover:text-primaryText transition-colors"
        title="Añadir medicamento"
      >
        <Plus class="w-4 h-4" />
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="medications.length === 0" class="py-6 text-center text-mutedText text-xs">
      <p>No hay medicamentos configurados.</p>
    </div>

    <!-- Medication Items List -->
    <div class="space-y-3">
      <div
        v-for="med in medications"
        :key="med.id"
        class="p-4 rounded-2xl border transition-all flex items-center justify-between gap-3"
        :class="med.is_overdue 
          ? 'bg-warningSoft-soft border-warningSoft-border' 
          : 'bg-subtle border-borderSubtle'"
      >
        <!-- Info Column -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <h4 class="text-sm font-bold text-primaryText truncate">{{ med.name }}</h4>
            <span 
              v-if="med.is_overdue"
              class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-warningSoft text-white"
            >
              <AlertCircle class="w-2.5 h-2.5" />
              Toca Dosis
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-mutedText">
            <span v-if="med.dose_description" class="text-secondaryText font-medium">{{ med.dose_description }}</span>
            <span>•</span>
            <span>Cada {{ med.interval_hours }}h</span>
          </div>

          <!-- Last administered time -->
          <div class="flex items-center gap-1 mt-1.5 text-[11px] font-medium" :class="med.is_overdue ? 'text-warningSoft font-semibold' : 'text-mutedText'">
            <Clock class="w-3 h-3" />
            <span>{{ formatTimeAgo(med.hours_since_last_dose) }}</span>
          </div>
        </div>

        <!-- Action: One-Tap Confirm Button -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :disabled="isLoading"
            @click="emit('log-dose', med.id)"
            class="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
            :class="med.is_overdue 
              ? 'bg-warningSoft text-white hover:opacity-90' 
              : 'bg-meds text-white hover:opacity-90'"
          >
            <Check class="w-3.5 h-3.5 stroke-[3]" />
            <span>Dar Dosis</span>
          </button>

          <button
            type="button"
            @click="emit('delete-medication', med.id)"
            class="p-2 text-mutedText hover:text-red-500 rounded-lg hover:bg-surface transition-colors"
            title="Eliminar medicamento"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Add New Medication -->
    <div 
      v-if="isAddModalOpen" 
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-soft-lg border border-borderSubtle">
        <div class="flex items-center justify-between pb-3 border-b border-borderSubtle mb-4">
          <h3 class="text-base font-bold text-primaryText">Añadir Medicamento / Suplemento</h3>
          <button type="button" @click="isAddModalOpen = false" class="p-1.5 text-mutedText hover:text-primaryText">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateMed" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Nombre</label>
            <input
              type="text"
              v-model="newMedName"
              placeholder="Ej. Vitamina D3, Hierro, Paracetamol..."
              required
              class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:ring-2 focus:ring-meds/40 outline-none"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Dosis / Presentación</label>
              <input
                type="text"
                v-model="newMedDose"
                placeholder="Ej. 4 gotas, 2.5 ml"
                class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Intervalo (Horas)</label>
              <input
                type="number"
                v-model.number="newMedInterval"
                min="1"
                max="168"
                required
                class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Notas (opcional)</label>
            <input
              type="text"
              v-model="newMedNotes"
              placeholder="Ej. Dar con la primera toma de la mañana"
              class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText outline-none"
            />
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="!newMedName.trim() || isLoading"
              class="w-full py-3 rounded-2xl bg-meds text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Check class="w-4 h-4 stroke-[3]" />
              <span>Guardar Medicamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  </section>
</template>
