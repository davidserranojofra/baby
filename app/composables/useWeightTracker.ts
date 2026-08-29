import { ref, computed } from 'vue';
import type { 
  WeightLog, 
  CreateWeightDTO, 
  UpdateWeightDTO, 
  WeightTimeframePeriod, 
  WeightChartPoint, 
  WeightStatsSummary 
} from '~/types/baby-tracker';

const weights = ref<WeightLog[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

export const useWeightTracker = () => {
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

  // 1. Fetch Weight Records
  const fetchWeights = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await executeWithRetry(async () => {
        const { data: resData, error: sbError } = await supabase
          .from('weight_logs')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(1000);

        if (sbError) throw sbError;
        return resData;
      });

      weights.value = (data as WeightLog[]) || [];
    } catch (err: any) {
      console.error('Error fetching weight logs:', err);
      error.value = sanitizeTrackerError(err, 'Error al cargar los registros de peso');
    } finally {
      isLoading.value = false;
    }
  };

  // 2. Create Weight Record
  const createWeight = async (dto: CreateWeightDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      const sbPayload = {
        weight_kg: Number(dto.weight_kg),
        recorded_at: dto.recorded_at || new Date().toISOString(),
        notes: dto.notes ? dto.notes.trim() : null
      };

      const { data, error: sbError } = await supabase
        .from('weight_logs')
        .insert([sbPayload])
        .select()
        .single();

      if (sbError) throw sbError;

      if (data) {
        // Insert and sort descending
        weights.value = [data as WeightLog, ...weights.value].sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      }
      return data;
    } catch (err: any) {
      console.error('Error creating weight log:', err);
      error.value = err.message || 'Error al guardar el control de peso';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Update Weight Record
  const updateWeight = async (dto: UpdateWeightDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      const sbPayload = {
        weight_kg: Number(dto.weight_kg),
        recorded_at: dto.recorded_at,
        notes: dto.notes ? dto.notes.trim() : null,
        updated_at: new Date().toISOString()
      };

      const { data, error: sbError } = await supabase
        .from('weight_logs')
        .update(sbPayload)
        .eq('id', dto.id)
        .select()
        .single();

      if (sbError) throw sbError;

      if (data) {
        weights.value = weights.value.map(w => (w.id === dto.id ? (data as WeightLog) : w)).sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      }
      return data;
    } catch (err: any) {
      console.error('Error updating weight log:', err);
      error.value = err.message || 'Error al actualizar el control de peso';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 4. Delete Weight Record
  const deleteWeight = async (id: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { error: sbError } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', id);

      if (sbError) throw sbError;

      weights.value = weights.value.filter(w => w.id !== id);
    } catch (err: any) {
      console.error('Error deleting weight log:', err);
      error.value = err.message || 'Error al eliminar el registro de peso';
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

  // 5. Computed: Latest Weight Log
  const latestWeight = computed<WeightLog | null>(() => {
    if (weights.value.length === 0) return null;
    return weights.value[0];
  });

  // 6. Computed: Stats Summary
  const stats = computed<WeightStatsSummary>(() => {
    const total = weights.value.length;
    if (total === 0) {
      return {
        latestWeightKg: null,
        latestWeightGrams: null,
        latestRecordedAt: null,
        diffRecentGrams: null,
        diffTotalGrams: null,
        firstWeightKg: null,
        totalLogsCount: 0
      };
    }

    // weights array is sorted descending (index 0 is newest, index total - 1 is oldest)
    const latest = weights.value[0];
    const previous = total > 1 ? weights.value[1] : null;
    const oldest = weights.value[total - 1];

    const latestKg = Number(latest.weight_kg);
    const latestGrams = Math.round(latestKg * 1000);

    const diffRecentGrams = previous 
      ? Math.round((latestKg - Number(previous.weight_kg)) * 1000) 
      : null;

    const diffTotalGrams = total > 1 
      ? Math.round((latestKg - Number(oldest.weight_kg)) * 1000) 
      : null;

    return {
      latestWeightKg: latestKg,
      latestWeightGrams: latestGrams,
      latestRecordedAt: latest.recorded_at,
      diffRecentGrams,
      diffTotalGrams,
      firstWeightKg: Number(oldest.weight_kg),
      totalLogsCount: total
    };
  });

  // 7. Deduplicate weights by Day taking strictly the LAST recorded weight of each day
  const deduplicatedDailyLogs = computed<WeightLog[]>(() => {
    if (weights.value.length === 0) return [];

    // Group by local day string
    const map = new Map<string, WeightLog>();

    // Iterate through all records
    // Since weights are ordered DESC, the first time we see a day, it is the most recent (last) entry of that day
    for (const log of weights.value) {
      const dateKey = getLocalDateKey(log.recorded_at);
      if (!map.has(dateKey)) {
        map.set(dateKey, log);
      } else {
        // If already encountered, check if this log has a newer recorded_at (safety check)
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
  const getChartPoints = (period: WeightTimeframePeriod): WeightChartPoint[] => {
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

    // If filter yields nothing because all records are older, fall back to all points so the chart doesn't break
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

      const weightKg = Number(log.weight_kg);
      const weightGrams = Math.round(weightKg * 1000);

      const prev = index > 0 ? filtered[index - 1] : null;
      const diffFromPrevGrams = prev 
        ? Math.round((weightKg - Number(prev.weight_kg)) * 1000) 
        : null;

      return {
        id: log.id,
        dateKey,
        dateLabel,
        fullDateLabel,
        weightKg,
        weightGrams,
        diffFromPrevGrams,
        notes: log.notes,
        rawLog: log
      };
    });
  };

  // 9. Reset state on logout
  const resetState = () => {
    weights.value = [];
    isLoading.value = false;
    error.value = null;
  };

  return {
    weights,
    isLoading,
    error,
    latestWeight,
    stats,
    deduplicatedDailyLogs,
    fetchWeights,
    createWeight,
    updateWeight,
    deleteWeight,
    getChartPoints,
    resetState
  };
};
