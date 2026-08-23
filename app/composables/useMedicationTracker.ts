import { ref, computed } from 'vue';
import type { Medication, MedicationLog, MedicationWithStatus, CreateMedicationDTO } from '~/types/baby-tracker';

const medications = ref<MedicationWithStatus[]>([]);
const recentLogs = ref<MedicationLog[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

export const useMedicationTracker = () => {
  const supabase = useSupabaseClient();

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

  // 1. Fetch Medications and compute their last administered status
  const fetchMedications = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { medsData, logsData } = await executeWithRetry(async () => {
        // Fetch active medications
        const { data: mData, error: medsError } = await supabase
          .from('medications')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (medsError) throw medsError;

        // Fetch logs
        const { data: lData, error: logsError } = await supabase
          .from('medication_logs')
          .select('*')
          .order('administered_at', { ascending: false })
          .limit(100);

        if (logsError) throw logsError;

        return { medsData: mData, logsData: lData };
      });

      recentLogs.value = (logsData as MedicationLog[]) || [];
      const rawMeds = (medsData as Medication[]) || [];

      // Compute status for each medication
      const now = Date.now();
      medications.value = rawMeds.map(med => {
        const lastLog = recentLogs.value.find(log => log.medication_id === med.id) || null;
        let hoursSince: number | null = null;
        let isOverdue = false;
        let nextDoseAt: string | null = null;

        if (lastLog) {
          const lastTime = new Date(lastLog.administered_at).getTime();
          const diffMs = now - lastTime;
          hoursSince = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1)));
          isOverdue = hoursSince >= med.interval_hours;
          nextDoseAt = new Date(lastTime + med.interval_hours * 60 * 60 * 1000).toISOString();
        } else {
          // Never administered
          isOverdue = true;
        }

        return {
          ...med,
          last_log: lastLog,
          hours_since_last_dose: hoursSince,
          is_overdue: isOverdue,
          next_dose_at: nextDoseAt
        };
      });
    } catch (err: any) {
      console.error('Error fetching medications:', err);
      error.value = sanitizeTrackerError(err, 'Error al cargar las medicaciones');
    } finally {
      isLoading.value = false;
    }
  };

  // 2. One-tap administration logger
  const logDose = async (medicationId: string, notes?: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const now = new Date().toISOString();
      const { data, error: sbError } = await supabase
        .from('medication_logs')
        .insert([{
          medication_id: medicationId,
          administered_at: now,
          notes: notes?.trim() || null
        }])
        .select()
        .single();

      if (sbError) throw sbError;

      if (data) {
        recentLogs.value.unshift(data as MedicationLog);
        await fetchMedications();
      }
    } catch (err: any) {
      console.error('Error logging medication dose:', err);
      error.value = err.message || 'Error al registrar dosis';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 3. Create new medication
  const createMedication = async (dto: CreateMedicationDTO) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: sbError } = await supabase
        .from('medications')
        .insert([{
          name: dto.name,
          dose_description: dto.dose_description || null,
          interval_hours: dto.interval_hours || 24,
          notes: dto.notes || null,
          is_active: true
        }])
        .select()
        .single();

      if (sbError) throw sbError;
      await fetchMedications();
      return data;
    } catch (err: any) {
      console.error('Error creating medication:', err);
      error.value = err.message || 'Error al crear medicamento';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 4. Delete medication
  const deleteMedication = async (id: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { error: sbError } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);

      if (sbError) throw sbError;
      await fetchMedications();
    } catch (err: any) {
      console.error('Error deleting medication:', err);
      error.value = err.message || 'Error al eliminar medicamento';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 5. Reset State on Logout
  const resetState = () => {
    medications.value = [];
    recentLogs.value = [];
    isLoading.value = false;
    error.value = null;
  };

  return {
    medications,
    recentLogs,
    isLoading,
    error,
    fetchMedications,
    logDose,
    createMedication,
    deleteMedication,
    resetState
  };
};
