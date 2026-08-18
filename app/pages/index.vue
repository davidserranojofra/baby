<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Moon, Sun, Baby, AlertTriangle, RefreshCw } from 'lucide-vue-next';
import { useFeedingTracker } from '~/composables/useFeedingTracker';
import { useMedicationTracker } from '~/composables/useMedicationTracker';
import { useTheme } from '~/composables/useTheme';
import type { CreateFeedingDTO, CreateMedicationDTO } from '~/types/baby-tracker';

// Theme composable
const { isDark, toggleTheme, initTheme } = useTheme();

// Domain Composables
const {
  feedings,
  isLoading: isFeedingLoading,
  error: feedingError,
  activeSession,
  lastFeeding,
  stats,
  fetchFeedings,
  startBreastSession,
  switchBreastSide,
  pauseActiveSession,
  resumeActiveSession,
  finishActiveSession,
  cancelActiveSession,
  createManualFeeding,
  deleteFeeding
} = useFeedingTracker();

const {
  medications,
  isLoading: isMedLoading,
  error: medError,
  fetchMedications,
  logDose,
  createMedication,
  deleteMedication
} = useMedicationTracker();

// UI Modals state
const isManualModalOpen = ref<boolean>(false);

const handleManualSubmit = async (dto: CreateFeedingDTO) => {
  try {
    await createManualFeeding(dto);
    isManualModalOpen.value = false;
  } catch (e) {
    // Handled in composable error state
  }
};

const handleCreateMedication = async (dto: CreateMedicationDTO) => {
  try {
    await createMedication(dto);
  } catch (e) {
    // Handled in composable
  }
};

onMounted(() => {
  initTheme();
  fetchFeedings();
  fetchMedications();
});
</script>

<template>
  <div class="min-h-screen bg-base text-primaryText transition-colors duration-200 pb-12">
    <!-- Top Mobile-Friendly Navbar -->
    <header class="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-borderSubtle px-4 py-3.5">
      <div class="max-w-md mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-breastLeft-soft border border-breastLeft-border flex items-center justify-center text-breastLeft">
            <Baby class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-base font-extrabold tracking-tight text-primaryText leading-none">Baby Tracker</h1>
            <span class="text-[10px] font-medium text-mutedText">Lactancia y Cuidados</span>
          </div>
        </div>

        <!-- Right action: Dark Mode Toggle -->
        <button
          type="button"
          @click="toggleTheme"
          class="p-2 rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText hover:text-primaryText transition-all active:scale-95 border border-borderSubtle"
          :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <Sun v-if="isDark" class="w-4 h-4 text-warningSoft" />
          <Moon v-else class="w-4 h-4 text-primaryText" />
        </button>
      </div>
    </header>

    <!-- Main Mobile Content Area -->
    <main class="max-w-md mx-auto px-4 pt-4 space-y-4">
      
      <!-- Global Error / Notice Banner (OWASP & Resilient Connection state) -->
      <div 
        v-if="feedingError || medError" 
        class="p-3.5 rounded-2xl bg-warningSoft-soft border border-warningSoft-border text-xs text-primaryText flex items-start gap-2.5"
      >
        <AlertTriangle class="w-4 h-4 text-warningSoft flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="font-bold">Aviso de conexión con Supabase</p>
          <p class="text-secondaryText text-[11px] mt-0.5">
            {{ feedingError || medError }}. Asegúrate de configurar tus variables de Supabase en el archivo <code class="font-mono bg-subtle px-1 py-0.5 rounded">.env</code>.
          </p>
        </div>
      </div>

      <!-- Module 1: Feeding Hero Dashboard -->
      <FeedingHero
        :last-feeding="lastFeeding"
        :is-loading="isFeedingLoading"
        @start-breast="startBreastSession"
        @open-manual="isManualModalOpen = true"
      />

      <!-- Module 2: Medication & Vitamin D Card -->
      <MedicationCard
        :medications="medications"
        :is-loading="isMedLoading"
        @log-dose="logDose"
        @create-medication="handleCreateMedication"
        @delete-medication="deleteMedication"
      />

      <!-- Module 3: Metrics & Historical Timeline -->
      <FeedingStats
        :stats="stats"
        :feedings="feedings"
        :is-loading="isFeedingLoading"
        @delete-feeding="deleteFeeding"
      />

    </main>

    <!-- Active Live Timer Modal -->
    <FeedingTimerModal
      :session="activeSession"
      :is-loading="isFeedingLoading"
      @switch-side="switchBreastSide"
      @pause="pauseActiveSession"
      @resume="resumeActiveSession"
      @finish="finishActiveSession"
      @cancel="cancelActiveSession"
      @update:notes="val => activeSession.notes = val"
    />

    <!-- Retroactive Manual Register Modal -->
    <FeedingManualModal
      :is-open="isManualModalOpen"
      :is-loading="isFeedingLoading"
      @close="isManualModalOpen = false"
      @submit="handleManualSubmit"
    />
  </div>
</template>
