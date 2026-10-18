<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Check, Moon, MessageSquare, Clock, ArrowRight } from 'lucide-vue-next';
import type { CreateSleepDTO } from '~/types/baby-tracker';
import { getLocalDateStr } from '~/composables/useSleepTracker';

const props = defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
  selectedDate?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: CreateSleepDTO): void;
}>();

const sleepDate = ref<string>('');
const startTime = ref<string>('22:00');
const endTime = ref<string>('23:30');
const durationHours = ref<number>(1);
const durationMinutes = ref<number>(30);
const notes = ref<string>('');

const parseTimeMinutes = (timeStr: string): number => {
  const parts = (timeStr || '00:00').split(':').map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h * 60 + m;
};

const formatMinutesToTime = (totalMin: number): string => {
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60).toString().padStart(2, '0');
  const m = (wrapped % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const syncDurationFromTimes = () => {
  const startMin = parseTimeMinutes(startTime.value);
  const endMin = parseTimeMinutes(endTime.value);
  // If endTime <= startTime, the sleep crosses 23:59 into the next calendar day
  const diffMin = endMin <= startMin
    ? (1440 - startMin) + endMin
    : endMin - startMin;

  durationHours.value = Math.floor(diffMin / 60);
  durationMinutes.value = diffMin % 60;
};

const syncEndTimeFromDuration = () => {
  const startMin = parseTimeMinutes(startTime.value);
  const h = Math.max(0, Math.min(24, Number(durationHours.value) || 0));
  const m = Math.max(0, Math.min(59, Number(durationMinutes.value) || 0));
  const durMin = h * 60 + m;
  endTime.value = formatMinutesToTime(startMin + durMin);
};

const initDateTime = () => {
  const now = new Date();
  sleepDate.value = props.selectedDate || getLocalDateStr(now);
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  startTime.value = `${hours}:${minutes}`;
  durationHours.value = 1;
  durationMinutes.value = 30;
  syncEndTimeFromDuration();
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    initDateTime();
    notes.value = '';
  }
});

const totalSeconds = computed(() => {
  const h = Math.max(0, Number(durationHours.value) || 0);
  const m = Math.max(0, Number(durationMinutes.value) || 0);
  return (h * 3600) + (m * 60);
});

const startDateObj = computed(() => {
  const dateParts = (sleepDate.value || getLocalDateStr()).split('-').map(Number);
  const [y, m, d] = dateParts.length === 3 && !dateParts.some(isNaN)
    ? dateParts
    : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
  const startMin = parseTimeMinutes(startTime.value);
  const startH = Math.floor(startMin / 60);
  const startM = startMin % 60;
  return new Date(y, m - 1, d, startH, startM, 0, 0);
});

const endDateObj = computed(() => {
  return new Date(startDateObj.value.getTime() + totalSeconds.value * 1000);
});

const nextMidnightMs = computed(() => {
  const s = startDateObj.value;
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1, 0, 0, 0, 0).getTime();
});

const crossesMidnight = computed(() => {
  return totalSeconds.value > 0 && endDateObj.value.getTime() > nextMidnightMs.value;
});

const formatSecToHoursMins = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};

const midnightSplitSummary = computed(() => {
  if (!crossesMidnight.value) return null;
  const day1Sec = Math.max(0, Math.round((nextMidnightMs.value - startDateObj.value.getTime()) / 1000));
  const day2Sec = Math.max(0, totalSeconds.value - day1Sec);
  const day1Label = startDateObj.value.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const day2Label = endDateObj.value.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return {
    day1Formatted: formatSecToHoursMins(day1Sec),
    day2Formatted: formatSecToHoursMins(day2Sec),
    day1Label,
    day2Label
  };
});

const handleSubmit = () => {
  if (totalSeconds.value <= 0) return;

  const payload: CreateSleepDTO = {
    started_at: startDateObj.value.toISOString(),
    ended_at: endDateObj.value.toISOString(),
    duration_seconds: totalSeconds.value,
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
        <!-- Start Date -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">
            Fecha de inicio del sueño
          </label>
          <input
            type="date"
            v-model="sleepDate"
            required
            class="w-full px-3.5 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-bottle/40 font-mono"
          />
        </div>

        <!-- Start & End Time ("Desde las 22:00 hasta las 02:00") -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-mutedText uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock class="w-3 h-3 text-bottle" />
              <span>Hora de inicio</span>
            </label>
            <input
              type="time"
              v-model="startTime"
              @input="syncDurationFromTimes"
              required
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-bottle/40 font-mono"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[11px] font-semibold text-mutedText uppercase tracking-wider flex items-center gap-1">
                <ArrowRight class="w-3 h-3 text-bottle" />
                <span>Hora de fin</span>
              </label>
              <span
                v-if="crossesMidnight"
                class="text-[10px] font-bold text-bottle bg-bottle-soft px-1.5 py-0.2 rounded-md border border-bottle-border"
              >
                +1 día
              </span>
            </div>
            <input
              type="time"
              v-model="endTime"
              @input="syncDurationFromTimes"
              required
              class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText focus:outline-none focus:ring-2 focus:ring-bottle/40 font-mono"
            />
          </div>
        </div>

        <!-- Duration: Hours and Minutes (Synchronized) -->
        <div>
          <label class="block text-xs font-semibold text-mutedText uppercase tracking-wider mb-1">
            Duración total
          </label>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-mutedText mb-1">Horas</label>
              <input
                type="number"
                v-model.number="durationHours"
                @input="syncEndTimeFromDuration"
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
                @input="syncEndTimeFromDuration"
                min="0"
                max="59"
                class="w-full px-3 py-2 text-xs rounded-xl bg-subtle border border-borderSubtle text-primaryText font-mono"
              />
            </div>
          </div>
        </div>

        <!-- Midnight Split Breakdown Badge -->
        <div
          v-if="crossesMidnight && midnightSplitSummary"
          class="p-3 rounded-2xl bg-bottle-soft/40 border border-bottle-border text-xs text-primaryText space-y-1"
        >
          <div class="font-bold text-bottle flex items-center gap-1.5">
            <Moon class="w-3.5 h-3.5 flex-shrink-0" />
            <span>Cruza medianoche (23:59 → día siguiente)</span>
          </div>
          <p class="text-[11px] text-secondaryText leading-relaxed">
            Cruza medianoche: <span class="font-mono font-bold text-primaryText">{{ midnightSplitSummary.day1Formatted }}</span> el día de inicio ({{ midnightSplitSummary.day1Label }}) + <span class="font-mono font-bold text-primaryText">{{ midnightSplitSummary.day2Formatted }}</span> al día siguiente ({{ midnightSplitSummary.day2Label }}).
          </p>
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
            :disabled="isLoading || totalSeconds <= 0"
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
