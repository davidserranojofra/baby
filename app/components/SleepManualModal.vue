<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Check, Moon, MessageSquare } from 'lucide-vue-next';
import type { CreateSleepDTO } from '~/types/baby-tracker';

const props = defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: CreateSleepDTO): void;
}>();

const startedAtLocal = ref<string>('');
const durationHours = ref<number>(1);
const durationMinutes = ref<number>(30);
const notes = ref<string>('');

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
  const totalSeconds = ((durationHours.value || 0) * 3600) + ((durationMinutes.value || 0) * 60);
  const endDate = new Date(startDate.getTime() + totalSeconds * 1000);

  const payload: CreateSleepDTO = {
    started_at: startDate.toISOString(),
    ended_at: endDate.toISOString(),
    duration_seconds: totalSeconds,
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
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-bottle-soft flex items-center justify-center text-bottle">
            <Moon class="w-4 h-4" />
          </div>
          <h3 class="text-base font-bold text-primaryText">Registrar Sueño Manual</h3>
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
        <!-- Start Date & Time -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">Hora en que se durmió</label>
          <input
            type="datetime-local"
            v-model="startedAtLocal"
            required
            class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-bottle/40 font-mono"
          />
        </div>

        <!-- Duration: Hours and Minutes -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-medium text-mutedText mb-1">Horas</label>
            <input
              type="number"
              v-model.number="durationHours"
              min="0"
              max="24"
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono"
            />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-mutedText mb-1">Minutos</label>
            <input
              type="number"
              v-model.number="durationMinutes"
              min="0"
              max="59"
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono"
            />
          </div>
        </div>

        <!-- Notes / Comments -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1 flex items-center gap-1">
            <MessageSquare class="w-3 h-3" />
            <span>Comentarios sobre el sueño</span>
          </label>
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Ej. Despertares nocturnos, se durmió fácil, cólicos..."
            class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-bottle/40 resize-none"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading || (durationHours === 0 && durationMinutes === 0)"
            class="w-full py-3 rounded-2xl bg-primaryText text-surface font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-soft-sm"
          >
            <Check class="w-4 h-4 stroke-[3]" />
            <span>{{ isLoading ? 'Guardando...' : 'Guardar Registro de Sueño' }}</span>
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
