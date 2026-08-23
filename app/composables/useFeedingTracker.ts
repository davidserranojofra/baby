import { ref, computed } from 'vue';
import type { 
  Feeding, 
  CreateFeedingDTO, 
  ActiveFeedingSession, 
  FeedingStatsSummary,
  ActiveFeedingSide,
  BottleMilkType
} from '~/types/baby-tracker';

const feedings = ref<Feeding[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

// Active live stopwatch state
const activeSession = ref<ActiveFeedingSession>({
  isActive: false,
  feedingType: 'breast',
  activeSide: null,
  startedAt: null,
  sideStartedAt: null,
  leftSeconds: 0,
  rightSeconds: 0,
  bottleMaternalSeconds: 0,
  bottleFormulaSeconds: 0,
  amountMaternalMl: null,
  amountFormulaMl: null,
  amountMl: null,
  bottleMilkType: null,
  notes: ''
});

let timerInterval: ReturnType<typeof setInterval> | null = null;

const STORAGE_KEY = 'baby_active_feeding_session';

const saveToStorage = () => {
  if (typeof window === 'undefined') return;
  if (activeSession.value.isActive) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSession.value));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const useFeedingTracker = () => {
  const supabase = useSupabaseClient();

  // Helper to accumulate active delta seconds
  const flushCurrentDelta = () => {
    if (!activeSession.value.isActive || !activeSession.value.activeSide || !activeSession.value.sideStartedAt) {
      return;
    }
    const now = Date.now();
    const delta = Math.floor((now - activeSession.value.sideStartedAt) / 1000);
    if (delta > 0) {
      const side = activeSession.value.activeSide;
      if (side === 'left') activeSession.value.leftSeconds += delta;
      else if (side === 'right') activeSession.value.rightSeconds += delta;
      else if (side === 'bottle_maternal') activeSession.value.bottleMaternalSeconds += delta;
      else if (side === 'bottle_formula') activeSession.value.bottleFormulaSeconds += delta;
      activeSession.value.sideStartedAt = now;
      saveToStorage();
    }
  };

  // 1. Live Stopwatch Tick Logic
  const startTimerTicker = () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      flushCurrentDelta();
    }, 1000);
  };

  const stopTimerTicker = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  const restoreFromStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ActiveFeedingSession;
        if (saved && saved.isActive) {
          if (saved.activeSide && saved.sideStartedAt) {
            const delta = Math.floor((Date.now() - saved.sideStartedAt) / 1000);
            if (delta > 0) {
              if (saved.activeSide === 'left') saved.leftSeconds += delta;
              else if (saved.activeSide === 'right') saved.rightSeconds += delta;
              else if (saved.activeSide === 'bottle_maternal') saved.bottleMaternalSeconds += delta;
              else if (saved.activeSide === 'bottle_formula') saved.bottleFormulaSeconds += delta;
            }
            saved.sideStartedAt = Date.now();
          }
          activeSession.value = saved;
          if (saved.activeSide) {
            startTimerTicker();
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore feeding session from localStorage:', e);
    }
  };

  // 2. Fetch Feedings (Expanded to 1000 for total historical control)
  const fetchFeedings = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: sbError } = await supabase
        .from('feedings')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1000);

      if (sbError) throw sbError;
      feedings.value = (data as Feeding[]) || [];
    } catch (err: any) {
      console.error('Error fetching feedings:', err);
      error.value = err.message || 'Error al cargar las tomas';
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Start Live Session - Left or Right Breast
  const startBreastSession = (side: 'left' | 'right') => {
    const now = Date.now();
    activeSession.value = {
      isActive: true,
      feedingType: 'breast',
      activeSide: side,
      startedAt: new Date(now).toISOString(),
      sideStartedAt: now,
      leftSeconds: 0,
      rightSeconds: 0,
      bottleMaternalSeconds: 0,
      bottleFormulaSeconds: 0,
      amountMaternalMl: null,
      amountFormulaMl: null,
      amountMl: null,
      bottleMilkType: null,
      notes: ''
    };
    saveToStorage();
    startTimerTicker();
  };

  // 4. Start Live Session - Bottle (Maternal or Formula)
  const startBottleSession = (milkType: 'maternal' | 'formula') => {
    const now = Date.now();
    const side = milkType === 'maternal' ? 'bottle_maternal' : 'bottle_formula';
    activeSession.value = {
      isActive: true,
      feedingType: 'bottle',
      activeSide: side,
      startedAt: new Date(now).toISOString(),
      sideStartedAt: now,
      leftSeconds: 0,
      rightSeconds: 0,
      bottleMaternalSeconds: 0,
      bottleFormulaSeconds: 0,
      amountMaternalMl: milkType === 'maternal' ? 60 : null,
      amountFormulaMl: milkType === 'formula' ? 90 : null,
      amountMl: milkType === 'maternal' ? 60 : 90,
      bottleMilkType: milkType,
      notes: ''
    };
    saveToStorage();
    startTimerTicker();
  };

  // 5. Switch Mode/Side in Active Session
  const switchSideOrType = (target: ActiveFeedingSide) => {
    if (!activeSession.value.isActive) return;

    flushCurrentDelta();

    const now = Date.now();
    activeSession.value.activeSide = target;
    activeSession.value.sideStartedAt = target ? now : null;

    // Detect if session is becoming mixed
    const hasBreast = activeSession.value.leftSeconds > 0 || activeSession.value.rightSeconds > 0 || target === 'left' || target === 'right';
    const hasBottle = activeSession.value.bottleMaternalSeconds > 0 || activeSession.value.bottleFormulaSeconds > 0 || target === 'bottle_maternal' || target === 'bottle_formula';
    
    if (hasBreast && hasBottle) {
      activeSession.value.feedingType = 'mixed';
    } else if (hasBreast) {
      activeSession.value.feedingType = 'breast';
    } else if (hasBottle) {
      activeSession.value.feedingType = 'bottle';
    }

    saveToStorage();
    if (target) {
      startTimerTicker();
    } else {
      stopTimerTicker();
    }
  };

  // 6. Pause Active Session
  const pauseActiveSession = () => {
    switchSideOrType(null);
  };

  // 7. Resume Active Session with specific side or default
  const resumeActiveSession = (side?: ActiveFeedingSide) => {
    if (!activeSession.value.isActive) return;
    const defaultSide = side || (activeSession.value.leftSeconds >= activeSession.value.rightSeconds ? 'right' : 'left');
    switchSideOrType(defaultSide);
  };

  // 8. Update bottle ml amount in active session
  const setBottleAmount = (type: 'maternal' | 'formula', ml: number | null) => {
    if (type === 'maternal') {
      activeSession.value.amountMaternalMl = ml;
    } else {
      activeSession.value.amountFormulaMl = ml;
    }
    const mat = activeSession.value.amountMaternalMl || 0;
    const form = activeSession.value.amountFormulaMl || 0;
    activeSession.value.amountMl = (mat + form) > 0 ? (mat + form) : null;
    saveToStorage();
  };

  // 9. Finish and Persist Live Session
  const finishActiveSession = async () => {
    if (!activeSession.value.isActive || !activeSession.value.startedAt) return;

    pauseActiveSession();

    const {
      leftSeconds,
      rightSeconds,
      bottleMaternalSeconds,
      bottleFormulaSeconds,
      amountMaternalMl,
      amountFormulaMl,
      notes,
      startedAt
    } = activeSession.value;

    const totalSeconds = leftSeconds + rightSeconds + bottleMaternalSeconds + bottleFormulaSeconds;
    const totalMl = (amountMaternalMl || 0) + (amountFormulaMl || 0);

    const hasBreast = leftSeconds > 0 || rightSeconds > 0;
    const hasBottle = bottleMaternalSeconds > 0 || bottleFormulaSeconds > 0 || totalMl > 0;

    let side: 'left' | 'right' | 'both' | null = null;
    if (hasBreast) {
      if (leftSeconds > 0 && rightSeconds > 0) side = 'both';
      else if (leftSeconds > 0) side = 'left';
      else if (rightSeconds > 0) side = 'right';
    }

    // Build descriptive tags to preserve maternal/formula breakdown and notes
    const tags: string[] = [];
    if (amountMaternalMl && amountMaternalMl > 0) tags.push(`Materna: ${amountMaternalMl}ml`);
    if (amountFormulaMl && amountFormulaMl > 0) tags.push(`Fórmula: ${amountFormulaMl}ml`);
    if (hasBreast && hasBottle) tags.push('Combinada');

    let combinedNotes = notes.trim();
    if (tags.length > 0) {
      const tagStr = `[${tags.join(' | ')}]`;
      combinedNotes = combinedNotes ? `${tagStr} ${combinedNotes}` : tagStr;
    }

    const payload: CreateFeedingDTO = {
      feeding_type: hasBreast ? 'breast' : 'bottle',
      breast_side: side,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      duration_seconds: totalSeconds,
      duration_left_seconds: leftSeconds,
      duration_right_seconds: rightSeconds,
      amount_ml: totalMl > 0 ? totalMl : null,
      amount_maternal_ml: amountMaternalMl,
      amount_formula_ml: amountFormulaMl,
      notes: combinedNotes || null
    };

    await createManualFeeding(payload);
    cancelActiveSession();
  };

  // 10. Cancel Active Session
  const cancelActiveSession = () => {
    stopTimerTicker();
    activeSession.value = {
      isActive: false,
      feedingType: 'breast',
      activeSide: null,
      startedAt: null,
      sideStartedAt: null,
      leftSeconds: 0,
      rightSeconds: 0,
      bottleMaternalSeconds: 0,
      bottleFormulaSeconds: 0,
      amountMaternalMl: null,
      amountFormulaMl: null,
      amountMl: null,
      bottleMilkType: null,
      notes: ''
    };
    saveToStorage();
  };

  // 11. Manual Creation
  const createManualFeeding = async (dto: CreateFeedingDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      // Clean payload for Supabase constraints
      const sbPayload = {
        feeding_type: dto.feeding_type,
        breast_side: dto.breast_side,
        started_at: dto.started_at,
        ended_at: dto.ended_at,
        duration_seconds: dto.duration_seconds || 0,
        duration_left_seconds: dto.duration_left_seconds || 0,
        duration_right_seconds: dto.duration_right_seconds || 0,
        amount_ml: dto.amount_ml || null,
        notes: dto.notes || null
      };

      const { data, error: sbError } = await supabase
        .from('feedings')
        .insert([sbPayload])
        .select()
        .single();

      if (sbError) throw sbError;
      if (data) {
        feedings.value.unshift(data as Feeding);
      }
    } catch (err: any) {
      console.error('Error saving feeding:', err);
      error.value = err.message || 'Error al guardar la toma';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 12. Delete Feeding
  const deleteFeeding = async (id: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { error: sbError } = await supabase
        .from('feedings')
        .delete()
        .eq('id', id);

      if (sbError) throw sbError;
      feedings.value = feedings.value.filter(f => f.id !== id);
    } catch (err: any) {
      console.error('Error deleting feeding:', err);
      error.value = err.message || 'Error al eliminar la toma';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 13. Computed: Last Feeding
  const lastFeeding = computed(() => {
    if (feedings.value.length === 0) return null;
    return feedings.value[0];
  });

  // 14. Computed: Daily Statistics with 4 Formats & Combinations
  const stats = computed<FeedingStatsSummary>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayFeedings = feedings.value.filter(f => {
      const logLocalDate = new Date(f.started_at).toLocaleDateString('en-CA');
      return logLocalDate === today || f.started_at.startsWith(today);
    });

    const totalFeedingsToday = todayFeedings.length;
    let totalDurationSecondsToday = 0;
    let leftBreastCount = 0;
    let rightBreastCount = 0;
    let bottleMaternalCount = 0;
    let bottleFormulaCount = 0;
    let bottleCount = 0;
    let mixedCount = 0;

    todayFeedings.forEach(f => {
      totalDurationSecondsToday += f.duration_seconds || 0;
      const notes = f.notes || '';
      const isMaternal = notes.includes('Materna');
      const isFormula = notes.includes('Fórmula') || (!isMaternal && f.feeding_type === 'bottle');
      const isMixed = notes.includes('Combinada') || ((f.duration_left_seconds > 0 || f.duration_right_seconds > 0) && (f.amount_ml || 0) > 0);

      if (isMixed) {
        mixedCount++;
      }

      if (f.feeding_type === 'bottle') {
        bottleCount++;
        if (isMaternal) bottleMaternalCount++;
        else bottleFormulaCount++;
      } else {
        if (f.breast_side === 'left') leftBreastCount++;
        else if (f.breast_side === 'right') rightBreastCount++;
        else if (f.breast_side === 'both') {
          leftBreastCount += 0.5;
          rightBreastCount += 0.5;
        }

        if (isMaternal) bottleMaternalCount++;
        if (isFormula && (f.amount_ml || 0) > 0) bottleFormulaCount++;
      }
    });

    const avgDurationMinutes = totalFeedingsToday > 0 
      ? Math.round((totalDurationSecondsToday / totalFeedingsToday) / 60) 
      : 0;

    // Average rest interval calculation
    let avgRestIntervalMinutes = 0;
    if (todayFeedings.length > 1) {
      let totalRestSeconds = 0;
      for (let i = 0; i < todayFeedings.length - 1; i++) {
        const currentStart = new Date(todayFeedings[i].started_at).getTime();
        const prevEnd = new Date(todayFeedings[i + 1].ended_at).getTime();
        const diffSeconds = (currentStart - prevEnd) / 1000;
        if (diffSeconds > 0) {
          totalRestSeconds += diffSeconds;
        }
      }
      avgRestIntervalMinutes = Math.round((totalRestSeconds / (todayFeedings.length - 1)) / 60);
    }

    const totalActions = leftBreastCount + rightBreastCount + bottleCount;
    const leftPercentage = totalActions > 0 ? Math.round((leftBreastCount / totalActions) * 100) : 50;
    const rightPercentage = totalActions > 0 ? Math.round((rightBreastCount / totalActions) * 100) : 50;
    const bottlePercentage = totalActions > 0 ? Math.round((bottleCount / totalActions) * 100) : 0;
    const bottleMaternalPercentage = totalActions > 0 ? Math.round((bottleMaternalCount / totalActions) * 100) : 0;
    const bottleFormulaPercentage = totalActions > 0 ? Math.round((bottleFormulaCount / totalActions) * 100) : 0;

    return {
      totalFeedingsToday,
      totalDurationSecondsToday,
      avgDurationMinutes,
      avgRestIntervalMinutes,
      leftBreastCount,
      rightBreastCount,
      bottleMaternalCount,
      bottleFormulaCount,
      bottleCount,
      mixedCount,
      leftPercentage,
      rightPercentage,
      bottleMaternalPercentage,
      bottleFormulaPercentage,
      bottlePercentage,
      lastFeeding: lastFeeding.value
    };
  });

  // 15. Reset State on Logout
  const resetState = () => {
    cancelActiveSession();
    feedings.value = [];
    isLoading.value = false;
    error.value = null;
  };

  return {
    feedings,
    isLoading,
    error,
    activeSession,
    lastFeeding,
    stats,
    fetchFeedings,
    startBreastSession,
    startBottleSession,
    switchBreastSide: (side: 'left' | 'right') => switchSideOrType(side),
    switchSideOrType,
    setBottleAmount,
    pauseActiveSession,
    resumeActiveSession,
    finishActiveSession,
    cancelActiveSession,
    createManualFeeding,
    deleteFeeding,
    resetState,
    restoreFromStorage
  };
};

