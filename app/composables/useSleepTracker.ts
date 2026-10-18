import { ref, computed } from 'vue';
import type { 
  SleepLog, 
  CreateSleepDTO, 
  ActiveSleepSession, 
  SleepStatsSummary,
  TimeframePeriod,
  DaySleepMetric,
  PeriodSleepStatsSummary 
} from '~/types/baby-tracker';

const sleepLogs = ref<SleepLog[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

export const getLocalDateStr = (date: Date | string = new Date()): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSleepSecondsForDate = (log: SleepLog, dateStr: string): number => {
  if (!log || !log.started_at || !dateStr) return 0;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const [y, m, d] = parts;

  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();

  const logStart = new Date(log.started_at).getTime();
  const totalDuration = Math.max(0, log.duration_seconds || 0);
  const parsedEnd = log.ended_at ? new Date(log.ended_at).getTime() : NaN;
  const logEnd = !isNaN(parsedEnd) && parsedEnd > logStart
    ? parsedEnd
    : logStart + totalDuration * 1000;

  if (isNaN(logStart) || isNaN(logEnd) || logEnd <= logStart) {
    if (!isNaN(logStart) && logStart >= dayStart && logStart < dayEnd) {
      return totalDuration;
    }
    return 0;
  }

  const overlapStart = Math.max(logStart, dayStart);
  const overlapEnd = Math.min(logEnd, dayEnd);
  if (overlapEnd <= overlapStart) return 0;

  const overlapWallSeconds = (overlapEnd - overlapStart) / 1000;
  const wallSeconds = (logEnd - logStart) / 1000;
  if (wallSeconds <= 0) return 0;

  const ratio = totalDuration > 0 ? totalDuration / wallSeconds : 1;
  return Math.round(overlapWallSeconds * ratio);
};

const getTodayString = () => getLocalDateStr();

const selectedDate = ref<string>(getTodayString());
const selectedPeriod = ref<TimeframePeriod>('day');

const activeSession = ref<ActiveSleepSession>({
  isActive: false,
  isPaused: false,
  startedAt: null,
  segmentStartedAt: null,
  baseSeconds: 0,
  elapsedSeconds: 0,
  notes: ''
});

let sleepInterval: ReturnType<typeof setInterval> | null = null;
let isSleepListenersInitialized = false;

const STORAGE_KEY = 'baby_active_sleep_session';

const saveToStorage = () => {
  if (typeof window === 'undefined') return;
  if (activeSession.value.isActive) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSession.value));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const useSleepTracker = () => {
  const supabase = useSupabaseClient();

  // 1. Live Wall-Clock Reconciler (Anchor + Offset Ground Truth)
  const reconcileElapsed = (now = Date.now()) => {
    if (!activeSession.value.isActive) return;
    if (activeSession.value.isPaused || !activeSession.value.segmentStartedAt) {
      activeSession.value.elapsedSeconds = activeSession.value.baseSeconds || 0;
      return;
    }
    const currentSegment = Math.max(0, Math.floor((now - activeSession.value.segmentStartedAt) / 1000));
    activeSession.value.elapsedSeconds = (activeSession.value.baseSeconds || 0) + currentSegment;
  };

  const startTimerTicker = () => {
    if (sleepInterval) clearInterval(sleepInterval);
    reconcileElapsed();
    sleepInterval = setInterval(() => {
      reconcileElapsed();
    }, 1000);
  };

  const stopTimerTicker = () => {
    if (sleepInterval) {
      clearInterval(sleepInterval);
      sleepInterval = null;
    }
  };

  const restoreFromStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ActiveSleepSession;
        if (saved && saved.isActive) {
          // Backward-compatible migration from legacy schema if needed
          if (saved.baseSeconds === undefined) {
            saved.baseSeconds = saved.elapsedSeconds || 0;
            saved.segmentStartedAt = saved.isPaused ? null : (saved.lastTickTime || Date.now());
          }
          activeSession.value = saved;
          reconcileElapsed();
          if (!saved.isPaused) {
            startTimerTicker();
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore sleep session from localStorage:', e);
    }
  };

  // Register resilient foreground/lifecycle sync listeners once
  const setupLifecycleListeners = () => {
    if (typeof window === 'undefined' || isSleepListenersInitialized) return;
    isSleepListenersInitialized = true;

    const onWake = () => {
      restoreFromStorage();
      reconcileElapsed();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onWake();
      } else {
        saveToStorage();
      }
    });

    window.addEventListener('pageshow', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        restoreFromStorage();
      }
    });
    window.addEventListener('beforeunload', () => {
      saveToStorage();
    });
  };

  if (typeof window !== 'undefined') {
    setupLifecycleListeners();
  }

  // Helper to execute Supabase async queries with automatic clock-skew retry
  const executeWithRetry = async <T>(fn: () => Promise<T>, retries = 2, delayMs = 1200): Promise<T> => {
    try {
      return await fn();
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      const isClockOrJwtIssue =
        msg.includes('jwt') ||
        msg.includes('future') ||
        msg.includes('invalid_grant') ||
        msg.includes('not yet valid') ||
        msg.includes('network') ||
        msg.includes('fetch');

      if (retries > 0 && isClockOrJwtIssue) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return executeWithRetry(fn, retries - 1, delayMs);
      }
      throw err;
    }
  };

  const sanitizeTrackerError = (err: any, fallback: string): string => {
    if (!err) return fallback;
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('jwt') || msg.includes('future') || msg.includes('not yet valid')) {
      return 'Sincronizando sesión segura...';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Sin conexión con el servidor. Reintentando...';
    }
    return err.message || fallback;
  };

  // 2. Fetch Sleep Logs (Expanded to 1000 for total historical control)
  const fetchSleepLogs = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await executeWithRetry(async () => {
        const { data: resData, error: sbError } = await supabase
          .from('sleep_logs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(1000);

        if (sbError) throw sbError;
        return resData;
      });

      sleepLogs.value = (data as SleepLog[]) || [];
    } catch (err: any) {
      console.error('Error fetching sleep logs:', err);
      error.value = sanitizeTrackerError(err, 'Error al cargar registros de sueño');
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
      segmentStartedAt: now,
      baseSeconds: 0,
      elapsedSeconds: 0,
      notes: ''
    };
    saveToStorage();
    startTimerTicker();
  };

  // 4. Pause Sleep Session
  const pauseSleepSession = () => {
    if (!activeSession.value.isActive || activeSession.value.isPaused) return;
    const now = Date.now();
    if (activeSession.value.segmentStartedAt) {
      const currentSegment = Math.max(0, Math.floor((now - activeSession.value.segmentStartedAt) / 1000));
      activeSession.value.baseSeconds = (activeSession.value.baseSeconds || 0) + currentSegment;
    }
    activeSession.value.isPaused = true;
    activeSession.value.segmentStartedAt = null;
    activeSession.value.elapsedSeconds = activeSession.value.baseSeconds || 0;
    stopTimerTicker();
    saveToStorage();
  };

  // 5. Resume Sleep Session
  const resumeSleepSession = () => {
    if (!activeSession.value.isActive || !activeSession.value.isPaused) return;
    const now = Date.now();
    activeSession.value.isPaused = false;
    activeSession.value.segmentStartedAt = now;
    saveToStorage();
    startTimerTicker();
  };

  // 6. Finish and Persist Live Sleep Session
  const finishSleepSession = async () => {
    if (!activeSession.value.isActive || !activeSession.value.startedAt) return;

    reconcileElapsed();
    const totalDuration = activeSession.value.elapsedSeconds;
    pauseSleepSession();

    const endedAt = new Date().toISOString();
    const payload: CreateSleepDTO = {
      started_at: activeSession.value.startedAt,
      ended_at: endedAt,
      duration_seconds: totalDuration,
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
      segmentStartedAt: null,
      baseSeconds: 0,
      elapsedSeconds: 0,
      notes: ''
    };
    saveToStorage();
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

  // 11. Helper to format seconds to "Xh Ym"
  const formatSecondsToReadable = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  };

  // 12. Helper to get sleep logs overlapping a specific local date YYYY-MM-DD
  const getLogsForDate = (dateStr: string) => {
    return sleepLogs.value
      .filter(s => getSleepSecondsForDate(s, dateStr) > 0)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  };

  // 13. Calculate Stats for any single date (split-on-read across midnight)
  const getSleepStatsForDate = (dateStr: string): SleepStatsSummary => {
    const dayLogs = getLogsForDate(dateStr);
    const napCount = dayLogs.length;
    let totalSleepSeconds = 0;
    let longestNapSec = 0;

    dayLogs.forEach(s => {
      const duration = getSleepSecondsForDate(s, dateStr);
      totalSleepSeconds += duration;
      if (duration > longestNapSec) {
        longestNapSec = duration;
      }
    });

    const avgNapMinutes = napCount > 0 ? Math.round((totalSleepSeconds / napCount) / 60) : 0;
    const longestNapMinutes = Math.round(longestNapSec / 60);

    return {
      totalSleepSecondsToday: totalSleepSeconds,
      totalSleepFormatted: formatSecondsToReadable(totalSleepSeconds),
      napCountToday: napCount,
      avgNapMinutesToday: avgNapMinutes,
      longestNapMinutesToday: longestNapMinutes,
      lastSleep: dayLogs.length > 0 ? dayLogs[0] : null,
      selectedDate: dateStr
    };
  };

  // 14. Computed: Today's sleep stats (backward-compatible)
  const sleepStats = computed<SleepStatsSummary>(() => {
    return getSleepStatsForDate(getTodayString());
  });

  // 15. Computed: Selected date's sleep stats
  const selectedDateSleepStats = computed<SleepStatsSummary>(() => {
    return getSleepStatsForDate(selectedDate.value);
  });

  // 16. Calculate Comprehensive Period Stats (Day, Week, Month, All)
  const getSleepStatsForPeriod = (period: TimeframePeriod | 'all', targetDateStr: string): PeriodSleepStatsSummary => {
    const today = getTodayString();
    const target = new Date(targetDateStr + 'T12:00:00');
    const dayNamesShort = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const datesToInclude: { dateStr: string; label: string; short: string }[] = [];
    let periodLabel = '';

    if (period === 'day') {
      const isToday = targetDateStr === today;
      const dayName = target.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      periodLabel = isToday ? `Hoy (${dayName})` : dayName;
      datesToInclude.push({
        dateStr: targetDateStr,
        label: isToday ? 'Hoy' : target.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        short: dayNamesShort[target.getDay()]
      });
    } else if (period === 'week') {
      const currentDay = target.getDay(); // 0 is Sun, 1 is Mon...
      const diffToMonday = (currentDay + 6) % 7; // days since Monday
      const monday = new Date(target);
      monday.setDate(target.getDate() - diffToMonday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = getLocalDateStr(d);
        const isToday = dStr === today;
        datesToInclude.push({
          dateStr: dStr,
          label: isToday ? 'Hoy' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          short: dayNamesShort[d.getDay()]
        });
      }

      const firstDate = datesToInclude[0].dateStr;
      const lastDate = datesToInclude[6].dateStr;
      const startFmt = new Date(firstDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const endFmt = new Date(lastDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      periodLabel = `Semana: ${startFmt} - ${endFmt}`;
    } else if (period === 'month') {
      const year = target.getFullYear();
      const month = target.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const dStr = getLocalDateStr(d);
        datesToInclude.push({
          dateStr: dStr,
          label: `${day}`,
          short: `${day}`
        });
      }

      periodLabel = `${monthNames[month]} ${year}`;
    } else if (period === 'all') {
      periodLabel = 'Todo el historial';
      const dailyMap = new Set<string>();
      sleepLogs.value.forEach(l => {
        const startD = new Date(l.started_at);
        const endD = l.ended_at ? new Date(l.ended_at) : new Date(startD.getTime() + (l.duration_seconds || 0) * 1000);
        const cursor = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 12, 0, 0, 0);
        const endCursor = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 12, 0, 0, 0);
        while (cursor.getTime() <= endCursor.getTime()) {
          const dStr = getLocalDateStr(cursor);
          if (getSleepSecondsForDate(l, dStr) > 0) {
            dailyMap.add(dStr);
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      });

      Array.from(dailyMap).sort().forEach(dStr => {
        const d = new Date(dStr + 'T12:00:00');
        const isToday = dStr === today;
        datesToInclude.push({
          dateStr: dStr,
          label: isToday ? 'Hoy' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          short: dayNamesShort[d.getDay()]
        });
      });
    }

    // Build day-by-day metrics using split-on-read getSleepSecondsForDate
    let totalPeriodSeconds = 0;
    let longestNapPeriodSec = 0;
    const periodLogMap = new Map<string, SleepLog>();
    const periodLogSecondsMap = new Map<string, number>();

    const dailyBreakdown: DaySleepMetric[] = datesToInclude.map(item => {
      let dayTotalSec = 0;
      let dayNapCount = 0;

      sleepLogs.value.forEach(l => {
        const sliceSec = getSleepSecondsForDate(l, item.dateStr);
        if (sliceSec > 0) {
          dayTotalSec += sliceSec;
          dayNapCount += 1;
          periodLogMap.set(l.id, l);
          const accumulatedForLog = (periodLogSecondsMap.get(l.id) || 0) + sliceSec;
          periodLogSecondsMap.set(l.id, accumulatedForLog);
          if (accumulatedForLog > longestNapPeriodSec) {
            longestNapPeriodSec = accumulatedForLog;
          }
        }
      });

      totalPeriodSeconds += dayTotalSec;

      return {
        date: item.dateStr,
        dayLabel: item.label,
        dayShort: item.short,
        totalSleepSeconds: dayTotalSec,
        totalSleepFormatted: formatSecondsToReadable(dayTotalSec),
        totalHoursDecimal: Math.round((dayTotalSec / 3600) * 10) / 10,
        napCount: dayNapCount,
        isTargetDay: item.dateStr === targetDateStr
      };
    });

    const periodLogs = Array.from(periodLogMap.values());
    const totalPeriodNaps = periodLogs.length;

    const daysCount = datesToInclude.length || 1;
    const dailyAvgSeconds = Math.round(totalPeriodSeconds / daysCount);
    const dailyAvgHoursDecimal = Math.round((dailyAvgSeconds / 3600) * 10) / 10;
    const dailyAvgNaps = Math.round((totalPeriodNaps / daysCount) * 10) / 10;
    const avgNapMinutes = totalPeriodNaps > 0 ? Math.round((totalPeriodSeconds / totalPeriodNaps) / 60) : 0;
    const longestNapMinutes = Math.round(longestNapPeriodSec / 60);

    return {
      period: (period === 'all' ? 'month' : period) as TimeframePeriod,
      targetDate: targetDateStr,
      periodLabel,
      totalSleepSeconds: totalPeriodSeconds,
      totalSleepFormatted: formatSecondsToReadable(totalPeriodSeconds),
      dailyAvgSleepFormatted: formatSecondsToReadable(dailyAvgSeconds),
      dailyAvgHoursDecimal,
      napCount: totalPeriodNaps,
      dailyAvgNaps,
      avgNapMinutes,
      longestNapMinutes,
      dailyBreakdown,
      logs: periodLogs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    };
  };

  // 17. Computed: Current Period Stats
  const currentPeriodSleepStats = computed<PeriodSleepStatsSummary>(() => {
    return getSleepStatsForPeriod(selectedPeriod.value, selectedDate.value);
  });

  // 18. Date & Period Navigation Helpers
  const setSelectedDate = (date: string) => {
    selectedDate.value = date;
  };

  const setSelectedPeriod = (period: TimeframePeriod) => {
    selectedPeriod.value = period;
  };

  const navigateDate = (step: number) => {
    const d = new Date(selectedDate.value + 'T12:00:00');
    if (selectedPeriod.value === 'day') {
      d.setDate(d.getDate() + step);
    } else if (selectedPeriod.value === 'week') {
      d.setDate(d.getDate() + (step * 7));
    } else if (selectedPeriod.value === 'month') {
      d.setMonth(d.getMonth() + step);
    }
    selectedDate.value = getLocalDateStr(d);
  };

  const goToToday = () => {
    selectedDate.value = getTodayString();
  };

  // 19. Reset State on Logout
  const resetState = () => {
    cancelSleepSession();
    sleepLogs.value = [];
    isLoading.value = false;
    error.value = null;
    selectedDate.value = getTodayString();
    selectedPeriod.value = 'day';
  };

  return {
    sleepLogs,
    isLoading,
    error,
    activeSession,
    lastSleepLog,
    sleepStats,
    selectedDate,
    selectedPeriod,
    selectedDateSleepStats,
    currentPeriodSleepStats,
    fetchSleepLogs,
    startSleepSession,
    pauseSleepSession,
    resumeSleepSession,
    finishSleepSession,
    cancelSleepSession,
    createManualSleep,
    deleteSleep,
    resetState,
    restoreFromStorage,
    setSelectedDate,
    setSelectedPeriod,
    navigateDate,
    goToToday,
    getLocalDateStr,
    getSleepSecondsForDate,
    getLogsForDate,
    getSleepStatsForDate,
    getSleepStatsForPeriod
  };
};

