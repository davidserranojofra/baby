<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Moon, Sun, Baby, AlertTriangle, LogOut, User as UserIcon, Loader2 } from 'lucide-vue-next';
import { useFeedingTracker } from '~/composables/useFeedingTracker';
import { useSleepTracker } from '~/composables/useSleepTracker';
import { useMedicationTracker } from '~/composables/useMedicationTracker';
import { useTheme } from '~/composables/useTheme';
import { useAuth } from '~/composables/useAuth';
import type { TabType } from '~/components/BottomNav.vue';
import type { CreateFeedingDTO, CreateSleepDTO, CreateMedicationDTO } from '~/types/baby-tracker';

// Navigation tab state
const currentTab = ref<TabType>('feeding');

// Theme composable
const { isDark, toggleTheme, initTheme } = useTheme();

// Auth composable
const { user, userDisplayName, userEmail, logout, isLoading: isAuthLoading } = useAuth();
const isLogoutModalOpen = ref(false);

// Domain Composables
const {
  feedings,
  isLoading: isFeedingLoading,
  error: feedingError,
  activeSession: activeFeedingSession,
  lastFeeding,
  stats: feedingStats,
  fetchFeedings,
  startBreastSession,
  switchBreastSide,
  pauseActiveSession: pauseFeedingSession,
  resumeActiveSession: resumeFeedingSession,
  finishActiveSession: finishFeedingSession,
  cancelActiveSession: cancelFeedingSession,
  createManualFeeding,
  deleteFeeding
} = useFeedingTracker();

const {
  sleepLogs,
  isLoading: isSleepLoading,
  error: sleepError,
  activeSession: activeSleepSession,
  lastSleepLog,
  sleepStats,
  fetchSleepLogs,
  startSleepSession,
  pauseSleepSession,
  resumeSleepSession,
  finishSleepSession,
  cancelSleepSession,
  createManualSleep,
  deleteSleep
} = useSleepTracker();

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
const isManualFeedingOpen = ref<boolean>(false);
const isManualSleepOpen = ref<boolean>(false);

const hasOverdueMeds = computed(() => {
  return medications.value.some(m => m.is_overdue);
});

const handleManualFeedingSubmit = async (dto: CreateFeedingDTO) => {
  try {
    await createManualFeeding(dto);
    isManualFeedingOpen.value = false;
  } catch (e) {
    // Handled in composable
  }
};

const handleManualSleepSubmit = async (dto: CreateSleepDTO) => {
  try {
    await createManualSleep(dto);
    isManualSleepOpen.value = false;
  } catch (e) {
    // Handled in composable
  }
};

const handleCreateMedication = async (dto: CreateMedicationDTO) => {
  try {
    await createMedication(dto);
  } catch (e) {
    // Handled in composable
  }
};

const confirmLogout = async () => {
  await logout();
  isLogoutModalOpen.value = false;
};

onMounted(() => {
  initTheme();
  fetchFeedings();
  fetchSleepLogs();
  fetchMedications();
});
</script>

<template>
  <div class="min-h-screen bg-base text-primaryText transition-colors duration-200 pb-24">
    <!-- Top Mobile Navbar -->
    <header class="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-borderSubtle px-4 py-3">
      <div class="max-w-md mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div 
            class="w-8 h-8 rounded-xl flex items-center justify-center border transition-all"
            :class="{
              'bg-breastLeft-soft border-breastLeft-border text-breastLeft': currentTab === 'feeding',
              'bg-bottle-soft border-bottle-border text-bottle': currentTab === 'sleep',
              'bg-meds-soft border-meds-border text-meds': currentTab === 'meds',
              'bg-subtle border-borderSubtle text-primaryText': currentTab === 'stats'
            }"
          >
            <Baby v-if="currentTab === 'feeding'" class="w-5 h-5" />
            <Moon v-else-if="currentTab === 'sleep'" class="w-5 h-5" />
            <Baby v-else class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-base font-extrabold tracking-tight text-primaryText leading-none">Baby Tracker</h1>
            <span class="text-[10px] font-medium text-mutedText block mt-0.5 truncate max-w-[140px]" :title="userEmail">
              {{ userDisplayName || 'Mi Bebé' }}
            </span>
          </div>
        </div>

        <!-- Right actions: Theme Toggle + Logout -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click="toggleTheme"
            class="p-2 rounded-xl bg-subtle hover:bg-borderSubtle text-secondaryText hover:text-primaryText transition-all active:scale-95 border border-borderSubtle"
            :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          >
            <Sun v-if="isDark" class="w-4 h-4 text-warningSoft" />
            <Moon v-else class="w-4 h-4 text-primaryText" />
          </button>

          <button
            type="button"
            @click="isLogoutModalOpen = true"
            class="p-2 rounded-xl bg-subtle hover:bg-rose-500/10 text-secondaryText hover:text-rose-500 transition-all active:scale-95 border border-borderSubtle"
            title="Cerrar sesión"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Mobile Content Area -->
    <main class="max-w-md mx-auto px-4 pt-4 space-y-4">
      
      <!-- Global Error / Notice Banner -->
      <div 
        v-if="feedingError || sleepError || medError" 
        class="p-3.5 rounded-2xl bg-warningSoft-soft border border-warningSoft-border text-xs text-primaryText flex items-start gap-2.5"
      >
        <AlertTriangle class="w-4 h-4 text-warningSoft flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="font-bold">Aviso de conexión</p>
          <p class="text-secondaryText text-[11px] mt-0.5">
            {{ feedingError || sleepError || medError }}
          </p>
        </div>
      </div>

      <!-- Tab 1: Lactancia / Feeding View -->
      <div v-show="currentTab === 'feeding'" class="space-y-4 animate-in fade-in duration-150">
        <FeedingHero
          :last-feeding="lastFeeding"
          :is-loading="isFeedingLoading"
          @start-breast="startBreastSession"
          @open-manual="isManualFeedingOpen = true"
        />

        <!-- Mini Quick KPI Summary -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-4 rounded-2xl bg-surface border border-borderSubtle shadow-soft-sm">
            <span class="text-[11px] font-semibold text-mutedText block">Tomas de hoy</span>
            <span class="text-2xl font-black text-primaryText font-mono mt-0.5 block">
              {{ feedingStats.totalFeedingsToday }}
            </span>
          </div>
          <div class="p-4 rounded-2xl bg-surface border border-borderSubtle shadow-soft-sm">
            <span class="text-[11px] font-semibold text-mutedText block">Duración media</span>
            <span class="text-2xl font-black text-primaryText font-mono mt-0.5 block">
              {{ feedingStats.avgDurationMinutes }}<span class="text-xs font-normal text-mutedText ml-0.5">min</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Tab 2: Sueño / Sleep View -->
      <div v-show="currentTab === 'sleep'" class="space-y-4 animate-in fade-in duration-150">
        <SleepHero
          :last-sleep="lastSleepLog"
          :is-loading="isSleepLoading"
          @start-sleep="startSleepSession"
          @open-manual="isManualSleepOpen = true"
        />

        <!-- Mini Sleep KPI Summary -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-4 rounded-2xl bg-surface border border-borderSubtle shadow-soft-sm">
            <span class="text-[11px] font-semibold text-mutedText block">Total Sueño Hoy</span>
            <span class="text-2xl font-black text-primaryText font-mono mt-0.5 block">
              {{ sleepStats.totalSleepFormatted }}
            </span>
          </div>
          <div class="p-4 rounded-2xl bg-surface border border-borderSubtle shadow-soft-sm">
            <span class="text-[11px] font-semibold text-mutedText block">Siestas Registradas</span>
            <span class="text-2xl font-black text-primaryText font-mono mt-0.5 block">
              {{ sleepStats.napCountToday }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tab 3: Medicación / Meds View -->
      <div v-show="currentTab === 'meds'" class="animate-in fade-in duration-150">
        <MedicationCard
          :medications="medications"
          :is-loading="isMedLoading"
          @log-dose="logDose"
          @create-medication="handleCreateMedication"
          @delete-medication="deleteMedication"
        />
      </div>

      <!-- Tab 4: Estadísticas / Stats View -->
      <div v-show="currentTab === 'stats'" class="animate-in fade-in duration-150">
        <FeedingStats
          :stats="feedingStats"
          :feedings="feedings"
          :sleep-stats="sleepStats"
          :sleep-logs="sleepLogs"
          :is-loading="isFeedingLoading || isSleepLoading"
          @delete-feeding="deleteFeeding"
          @delete-sleep="deleteSleep"
        />
      </div>

    </main>

    <!-- Bottom Navigation Bar -->
    <BottomNav
      :current-tab="currentTab"
      :has-overdue-meds="hasOverdueMeds"
      @update:tab="tab => currentTab = tab"
    />

    <!-- Active Live Breastfeeding Timer Modal -->
    <FeedingTimerModal
      :session="activeFeedingSession"
      :is-loading="isFeedingLoading"
      @switch-side="switchBreastSide"
      @pause="pauseFeedingSession"
      @resume="resumeFeedingSession"
      @finish="finishFeedingSession"
      @cancel="cancelFeedingSession"
      @update:notes="val => activeFeedingSession.notes = val"
    />

    <!-- Retroactive Manual Feeding Register Modal -->
    <FeedingManualModal
      :is-open="isManualFeedingOpen"
      :is-loading="isFeedingLoading"
      @close="isManualFeedingOpen = false"
      @submit="handleManualFeedingSubmit"
    />

    <!-- Active Live Sleep Timer Modal -->
    <SleepTimerModal
      :session="activeSleepSession"
      :is-loading="isSleepLoading"
      @pause="pauseSleepSession"
      @resume="resumeSleepSession"
      @finish="finishSleepSession"
      @cancel="cancelSleepSession"
      @update:notes="val => activeSleepSession.notes = val"
    />

    <!-- Retroactive Manual Sleep Register Modal -->
    <SleepManualModal
      :is-open="isManualSleepOpen"
      :is-loading="isSleepLoading"
      @close="isManualSleepOpen = false"
      @submit="handleManualSleepSubmit"
    />

    <!-- Logout Confirmation Modal -->
    <div
      v-if="isLogoutModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      @click.self="isLogoutModalOpen = false"
    >
      <div class="w-full max-w-xs bg-surface rounded-3xl border border-borderSubtle p-6 shadow-soft-lg space-y-4 text-center animate-in zoom-in-95 duration-150">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
          <LogOut class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-extrabold text-primaryText">¿Cerrar sesión?</h3>
          <p class="text-xs text-mutedText leading-relaxed">
            Se cerrará tu sesión activa en este dispositivo. Tus datos guardados están seguros.
          </p>
        </div>
        <div class="flex gap-2.5 pt-2">
          <button
            type="button"
            @click="isLogoutModalOpen = false"
            class="flex-1 py-2.5 rounded-2xl bg-subtle text-secondaryText font-bold text-xs hover:bg-borderSubtle transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="isAuthLoading"
            @click="confirmLogout"
            class="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-soft-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Loader2 v-if="isAuthLoading" class="w-3.5 h-3.5 animate-spin" />
            <span v-else>Salir</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
