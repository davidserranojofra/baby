import { ref, computed } from 'vue';
import type { 
  HeightLog, 
  CreateHeightDTO, 
  UpdateHeightDTO, 
  HeightTimeframePeriod, 
  HeightChartPoint, 
  HeightStatsSummary 
} from '~/types/baby-tracker';

const heights = ref<HeightLog[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

export const useHeightTracker = () => {
  const supabase = useSupabaseClient();

  // Helper to execute Supabase async queries with automatic clock-skew / network retry
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

  // 1. Fetch Height Records
  const fetchHeights = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await executeWithRetry(async () => {
        const { data: resData, error: sbError } = await supabase
          .from('height_logs')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(1000);

        if (sbError) throw sbError;
        return resData;
      });

      heights.value = (data as HeightLog[]) || [];
    } catch (err: any) {
      console.error('Error fetching height logs:', err);
      error.value = sanitizeTrackerError(err, 'Error al cargar los registros de altura');
    } finally {
      isLoading.value = false;
    }
  };

  // 2. Create Height Record
  const createHeight = async (dto: CreateHeightDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      const sbPayload = {
        height_cm: Number(dto.height_cm),
        recorded_at: dto.recorded_at || new Date().toISOString(),
        notes: dto.notes ? dto.notes.trim() : null
      };

      const { data, error: sbError } = await supabase
        .from('height_logs')
        .insert([sbPayload])
        .select()
        .single();

      if (sbError) throw sbError;

      if (data) {
        // Insert and sort descending
        heights.value = [data as HeightLog, ...heights.value].sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      }
      return data;
    } catch (err: any) {
      console.error('Error creating height log:', err);
      error.value = err.message || 'Error al guardar el control de altura';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Update Height Record
  const updateHeight = async (dto: UpdateHeightDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      const sbPayload = {
        height_cm: Number(dto.height_cm),
        recorded_at: dto.recorded_at,
        notes: dto.notes ? dto.notes.trim() : null,
        updated_at: new Date().toISOString()
      };

      const { data, error: sbError } = await supabase
        .from('height_logs')
        .update(sbPayload)
        .eq('id', dto.id)
        .select()
        .single();

      if (sbError) throw sbError;

      if (data) {
        heights.value = heights.value.map(h => (h.id === dto.id ? (data as HeightLog) : h)).sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      }
      return data;
    } catch (err: any) {
      console.error('Error updating height log:', err);
      error.value = err.message || 'Error al actualizar el control de altura';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 4. Delete Height Record
  const deleteHeight = async (id: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { error: sbError } = await supabase
        .from('height_logs')
        .delete()
        .eq('id', id);

      if (sbError) throw sbError;

      heights.value = heights.value.filter(h => h.id !== id);
    } catch (err: any) {
      console.error('Error deleting height log:', err);
      error.value = err.message || 'Error al eliminar el registro de altura';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // Utility to obtain local YYYY-MM-DD
  const getLocalDateKey = (isoStr: string): string => {
    const d = new Date(isoStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 5. Computed: Latest Height Log
  const latestHeight = computed<HeightLog | null>(() => {
    if (heights.value.length === 0) return null;
    return heights.value[0];
  });

  // 6. Computed: Stats Summary
  const stats = computed<HeightStatsSummary>(() => {
    const total = heights.value.length;
    if (total === 0) {
      return {
        latestHeightCm: null,
        latestRecordedAt: null,
        diffRecentCm: null,
        diffTotalCm: null,
        firstHeightCm: null,
        totalLogsCount: 0
      };
    }

    // heights array is sorted descending (index 0 is newest, index total - 1 is oldest)
    const latest = heights.value[0];
    const previous = total > 1 ? heights.value[1] : null;
    const oldest = heights.value[total - 1];

    const latestCm = Number(latest.height_cm);

    const diffRecentCm = previous 
      ? parseFloat((latestCm - Number(previous.height_cm)).toFixed(2))
      : null;

    const diffTotalCm = total > 1 
      ? parseFloat((latestCm - Number(oldest.height_cm)).toFixed(2))
      : null;

    return {
      latestHeightCm: latestCm,
      latestRecordedAt: latest.recorded_at,
      diffRecentCm,
      diffTotalCm,
      firstHeightCm: Number(oldest.height_cm),
      totalLogsCount: total
    };
  });

  // 7. Deduplicate heights by Day taking strictly the LAST recorded height of each day
  const deduplicatedDailyLogs = computed<HeightLog[]>(() => {
    if (heights.value.length === 0) return [];

    const map = new Map<string, HeightLog>();

    for (const log of heights.value) {
      const dateKey = getLocalDateKey(log.recorded_at);
      if (!map.has(dateKey)) {
        map.set(dateKey, log);
      } else {
        const current = map.get(dateKey)!;
        if (new Date(log.recorded_at).getTime() > new Date(current.recorded_at).getTime()) {
          map.set(dateKey, log);
        }
      }
    }

    // Return chronological order (ASCENDING for chart)
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
  });

  // 8. Generate Filtered Chart Points for a given Period (week, month, year, all)
  const getChartPoints = (period: HeightTimeframePeriod): HeightChartPoint[] => {
    const dailyLogs = deduplicatedDailyLogs.value;
    if (dailyLogs.length === 0) return [];

    const now = new Date();
    let cutoffTime = 0;

    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      cutoffTime = d.getTime();
    } else if (period === 'month') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      cutoffTime = d.getTime();
    } else if (period === 'year') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      cutoffTime = d.getTime();
    } else {
      cutoffTime = 0; // all
    }

    let filtered = cutoffTime > 0 
      ? dailyLogs.filter(l => new Date(l.recorded_at).getTime() >= cutoffTime)
      : dailyLogs;

    if (filtered.length === 0 && dailyLogs.length > 0) {
      filtered = dailyLogs;
    }

    return filtered.map((log, index) => {
      const dateObj = new Date(log.recorded_at);
      const dateKey = getLocalDateKey(log.recorded_at);
      
      const day = dateObj.getDate();
      const monthShort = dateObj.toLocaleDateString('es-ES', { month: 'short' });
      const dateLabel = `${day} ${monthShort}`;

      const fullDateLabel = dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const heightCm = Number(log.height_cm);

      const prev = index > 0 ? filtered[index - 1] : null;
      const diffFromPrevCm = prev 
        ? parseFloat((heightCm - Number(prev.height_cm)).toFixed(2))
        : null;

      return {
        id: log.id,
        dateKey,
        dateLabel,
        fullDateLabel,
        heightCm,
        diffFromPrevCm,
        notes: log.notes,
        rawLog: log
      };
    });
  };

  // 9. Reset state on logout
  const resetState = () => {
    heights.value = [];
    isLoading.value = false;
    error.value = null;
  };

  return {
    heights,
    isLoading,
    error,
    latestHeight,
    stats,
    deduplicatedDailyLogs,
    fetchHeights,
    createHeight,
    updateHeight,
    deleteHeight,
    getChartPoints,
    resetState
  };
};
