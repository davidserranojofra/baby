import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Feeding, CreateFeedingDTO, ActiveFeedingSession, FeedingStatsSummary } from '~/types/baby-tracker';

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
  amountMl: null,
  notes: ''
});

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useFeedingTracker = () => {
  const supabase = useSupabaseClient();

  // 1. Live Stopwatch Tick Logic
  const startTimerTicker = () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!activeSession.value.isActive || !activeSession.value.activeSide || !activeSession.value.sideStartedAt) {
        return;
      }
      const now = Date.now();
      const deltaSeconds = Math.floor((now - activeSession.value.sideStartedAt) / 1000);
      
      if (deltaSeconds > 0) {
        if (activeSession.value.activeSide === 'left') {
          activeSession.value.leftSeconds += deltaSeconds;
        } else if (activeSession.value.activeSide === 'right') {
          activeSession.value.rightSeconds += deltaSeconds;
        }
        activeSession.value.sideStartedAt = now;
      }
    }, 1000);
  };

  const stopTimerTicker = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  // 2. Fetch Feedings
  const fetchFeedings = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: sbError } = await supabase
        .from('feedings')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (sbError) throw sbError;
      feedings.value = (data as Feeding[]) || [];
    } catch (err: any) {
      console.error('Error fetching feedings:', err);
      error.value = err.message || 'Error al cargar las tomas';
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Start Live Session (Left or Right Breast)
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
      amountMl: null,
      notes: ''
    };
    startTimerTicker();
  };

  // 4. Switch Breast Side in Active Session
  const switchBreastSide = (side: 'left' | 'right') => {
    if (!activeSession.value.isActive) return;

    // Accumulate time for current side
    const now = Date.now();
    if (activeSession.value.activeSide && activeSession.value.sideStartedAt) {
      const deltaSeconds = Math.floor((now - activeSession.value.sideStartedAt) / 1000);
      if (activeSession.value.activeSide === 'left') {
        activeSession.value.leftSeconds += deltaSeconds;
      } else {
        activeSession.value.rightSeconds += deltaSeconds;
      }
    }

    activeSession.value.activeSide = side;
    activeSession.value.sideStartedAt = now;
    startTimerTicker();
  };

  // 5. Pause Active Session
  const pauseActiveSession = () => {
    if (!activeSession.value.isActive) return;
    const now = Date.now();
    if (activeSession.value.activeSide && activeSession.value.sideStartedAt) {
      const deltaSeconds = Math.floor((now - activeSession.value.sideStartedAt) / 1000);
      if (activeSession.value.activeSide === 'left') {
        activeSession.value.leftSeconds += deltaSeconds;
      } else {
        activeSession.value.rightSeconds += deltaSeconds;
      }
    }
    activeSession.value.activeSide = null;
    activeSession.value.sideStartedAt = null;
    stopTimerTicker();
  };

  // 6. Resume Active Session with Side
  const resumeActiveSession = (side: 'left' | 'right') => {
    if (!activeSession.value.isActive) return;
    const now = Date.now();
    activeSession.value.activeSide = side;
    activeSession.value.sideStartedAt = now;
    startTimerTicker();
  };

  // 7. Finish and Persist Live Session
  const finishActiveSession = async () => {
    if (!activeSession.value.isActive || !activeSession.value.startedAt) return;

    pauseActiveSession();

    const totalSeconds = activeSession.value.leftSeconds + activeSession.value.rightSeconds;
    const endedAt = new Date().toISOString();

    let side: 'left' | 'right' | 'both' = 'both';
    if (activeSession.value.leftSeconds > 0 && activeSession.value.rightSeconds === 0) {
      side = 'left';
    } else if (activeSession.value.rightSeconds > 0 && activeSession.value.leftSeconds === 0) {
      side = 'right';
    }

    const payload: CreateFeedingDTO = {
      feeding_type: 'breast',
      breast_side: side,
      started_at: activeSession.value.startedAt,
      ended_at: endedAt,
      duration_seconds: totalSeconds,
      duration_left_seconds: activeSession.value.leftSeconds,
      duration_right_seconds: activeSession.value.rightSeconds,
      notes: activeSession.value.notes?.trim() || null
    };

    await createManualFeeding(payload);
    cancelActiveSession();
  };

  // 8. Cancel Active Session
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
      amountMl: null,
      notes: ''
    };
  };

  // 9. Manual Creation
  const createManualFeeding = async (dto: CreateFeedingDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: sbError } = await supabase
        .from('feedings')
        .insert([dto])
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

  // 10. Delete Feeding
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

  // 11. Computed: Last Feeding
  const lastFeeding = computed(() => {
    if (feedings.value.length === 0) return null;
    return feedings.value[0];
  });

  // 12. Computed: Daily Statistics
  const stats = computed<FeedingStatsSummary>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayFeedings = feedings.value.filter(f => f.started_at.startsWith(today));

    const totalFeedingsToday = todayFeedings.length;
    let totalDurationSecondsToday = 0;
    let leftBreastCount = 0;
    let rightBreastCount = 0;
    let bottleCount = 0;

    todayFeedings.forEach(f => {
      totalDurationSecondsToday += f.duration_seconds || 0;
      if (f.feeding_type === 'bottle') {
        bottleCount++;
      } else {
        if (f.breast_side === 'left') leftBreastCount++;
        else if (f.breast_side === 'right') rightBreastCount++;
        else if (f.breast_side === 'both') {
          leftBreastCount += 0.5;
          rightBreastCount += 0.5;
        }
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

    return {
      totalFeedingsToday,
      totalDurationSecondsToday,
      avgDurationMinutes,
      avgRestIntervalMinutes,
      leftBreastCount,
      rightBreastCount,
      bottleCount,
      leftPercentage,
      rightPercentage,
      bottlePercentage,
      lastFeeding: lastFeeding.value
    };
  });

  // 13. Reset State on Logout
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
    switchBreastSide,
    pauseActiveSession,
    resumeActiveSession,
    finishActiveSession,
    cancelActiveSession,
    createManualFeeding,
    deleteFeeding,
    resetState
  };
};
