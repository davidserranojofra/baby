import { ref, computed } from 'vue';
import type { SleepLog, CreateSleepDTO, ActiveSleepSession, SleepStatsSummary } from '~/types/baby-tracker';

const sleepLogs = ref<SleepLog[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

const activeSession = ref<ActiveSleepSession>({
  isActive: false,
  isPaused: false,
  startedAt: null,
  lastTickTime: null,
  elapsedSeconds: 0,
  notes: ''
});

let sleepInterval: ReturnType<typeof setInterval> | null = null;

export const useSleepTracker = () => {
  const supabase = useSupabaseClient();

  // 1. Live Sleep Stopwatch Ticker
  const startTimerTicker = () => {
    if (sleepInterval) clearInterval(sleepInterval);
    sleepInterval = setInterval(() => {
      if (!activeSession.value.isActive || activeSession.value.isPaused || !activeSession.value.lastTickTime) {
        return;
      }
      const now = Date.now();
      const delta = Math.floor((now - activeSession.value.lastTickTime) / 1000);
      if (delta > 0) {
        activeSession.value.elapsedSeconds += delta;
        activeSession.value.lastTickTime = now;
      }
    }, 1000);
  };

  const stopTimerTicker = () => {
    if (sleepInterval) {
      clearInterval(sleepInterval);
      sleepInterval = null;
    }
  };

  // 2. Fetch Sleep Logs
  const fetchSleepLogs = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: sbError } = await supabase
        .from('sleep_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (sbError) throw sbError;
      sleepLogs.value = (data as SleepLog[]) || [];
    } catch (err: any) {
      console.error('Error fetching sleep logs:', err);
      error.value = err.message || 'Error al cargar registros de sueño';
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Start Live Sleep Session
  const startSleepSession = () => {
    const now = Date.now();
    activeSession.value = {
      isActive: true,
      isPaused: false,
      startedAt: new Date(now).toISOString(),
      lastTickTime: now,
      elapsedSeconds: 0,
      notes: ''
    };
    startTimerTicker();
  };

  // 4. Pause Sleep Session
  const pauseSleepSession = () => {
    if (!activeSession.value.isActive) return;
    if (activeSession.value.lastTickTime) {
      const now = Date.now();
      const delta = Math.floor((now - activeSession.value.lastTickTime) / 1000);
      if (delta > 0) {
        activeSession.value.elapsedSeconds += delta;
      }
    }
    activeSession.value.isPaused = true;
    activeSession.value.lastTickTime = null;
    stopTimerTicker();
  };

  // 5. Resume Sleep Session
  const resumeSleepSession = () => {
    if (!activeSession.value.isActive) return;
    activeSession.value.isPaused = false;
    activeSession.value.lastTickTime = Date.now();
    startTimerTicker();
  };

  // 6. Finish and Persist Live Sleep Session
  const finishSleepSession = async () => {
    if (!activeSession.value.isActive || !activeSession.value.startedAt) return;

    pauseSleepSession();

    const endedAt = new Date().toISOString();
    const payload: CreateSleepDTO = {
      started_at: activeSession.value.startedAt,
      ended_at: endedAt,
      duration_seconds: activeSession.value.elapsedSeconds,
      notes: activeSession.value.notes?.trim() || null
    };

    await createManualSleep(payload);
    cancelSleepSession();
  };

  // 7. Cancel Active Session
  const cancelSleepSession = () => {
    stopTimerTicker();
    activeSession.value = {
      isActive: false,
      isPaused: false,
      startedAt: null,
      lastTickTime: null,
      elapsedSeconds: 0,
      notes: ''
    };
  };

  // 8. Manual Sleep Entry
  const createManualSleep = async (dto: CreateSleepDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: sbError } = await supabase
        .from('sleep_logs')
        .insert([dto])
        .select()
        .single();

      if (sbError) throw sbError;
      if (data) {
        sleepLogs.value.unshift(data as SleepLog);
      }
    } catch (err: any) {
      console.error('Error creating sleep log:', err);
      error.value = err.message || 'Error al guardar registro de sueño';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 9. Delete Sleep Log
  const deleteSleep = async (id: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { error: sbError } = await supabase
        .from('sleep_logs')
        .delete()
        .eq('id', id);

      if (sbError) throw sbError;
      sleepLogs.value = sleepLogs.value.filter(s => s.id !== id);
    } catch (err: any) {
      console.error('Error deleting sleep log:', err);
      error.value = err.message || 'Error al eliminar registro de sueño';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 10. Computed: Last Sleep Log
  const lastSleepLog = computed(() => {
    if (sleepLogs.value.length === 0) return null;
    return sleepLogs.value[0];
  });

  // 11. Computed: Sleep Statistics for Today
  const sleepStats = computed<SleepStatsSummary>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySleeps = sleepLogs.value.filter(s => s.started_at.startsWith(today));

    const napCountToday = todaySleeps.length;
    let totalSleepSecondsToday = 0;
    let longestNapSec = 0;

    todaySleeps.forEach(s => {
      const duration = s.duration_seconds || 0;
      totalSleepSecondsToday += duration;
      if (duration > longestNapSec) {
        longestNapSec = duration;
      }
    });

    const totalHours = Math.floor(totalSleepSecondsToday / 3600);
    const totalMinutes = Math.floor((totalSleepSecondsToday % 3600) / 60);
    const totalSleepFormatted = `${totalHours}h ${totalMinutes}m`;

    const avgNapMinutesToday = napCountToday > 0 
      ? Math.round((totalSleepSecondsToday / napCountToday) / 60) 
      : 0;

    const longestNapMinutesToday = Math.round(longestNapSec / 60);

    return {
      totalSleepSecondsToday,
      totalSleepFormatted,
      napCountToday,
      avgNapMinutesToday,
      longestNapMinutesToday,
      lastSleep: lastSleepLog.value
    };
  });

  return {
    sleepLogs,
    isLoading,
    error,
    activeSession,
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
  };
};
