// ==============================================================================
// BABY TRACKER - STRICT TYPESCRIPT DOMAIN TYPES & DTOs
// ==============================================================================

export type FeedingType = 'breast' | 'bottle' | 'mixed';
export type BreastSide = 'left' | 'right' | 'both';
export type BottleMilkType = 'maternal' | 'formula' | 'mixed';
export type ActiveFeedingSide = 'left' | 'right' | 'bottle_maternal' | 'bottle_formula' | null;

export interface Feeding {
  id: string;
  user_id?: string | null;
  feeding_type: 'breast' | 'bottle'; // database enum value
  breast_side?: BreastSide | null;
  started_at: string; // ISO 8601 string
  ended_at: string;   // ISO 8601 string
  duration_seconds: number;
  duration_left_seconds: number;
  duration_right_seconds: number;
  amount_ml?: number | null;
  bottle_milk_type?: BottleMilkType | null;
  amount_maternal_ml?: number | null;
  amount_formula_ml?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedingDTO {
  feeding_type: 'breast' | 'bottle';
  breast_side?: BreastSide | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  duration_left_seconds?: number;
  duration_right_seconds?: number;
  amount_ml?: number | null;
  bottle_milk_type?: BottleMilkType | null;
  amount_maternal_ml?: number | null;
  amount_formula_ml?: number | null;
  notes?: string | null;
}

export interface Medication {
  id: string;
  user_id?: string | null;
  name: string;
  dose_description?: string | null;
  interval_hours: number;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicationDTO {
  name: string;
  dose_description?: string | null;
  interval_hours: number;
  notes?: string | null;
}

export interface MedicationLog {
  id: string;
  user_id?: string | null;
  medication_id: string;
  administered_at: string; // ISO 8601 string
  notes?: string | null;
  created_at: string;
}

export interface MedicationWithStatus extends Medication {
  last_log?: MedicationLog | null;
  hours_since_last_dose?: number | null;
  is_overdue?: boolean;
  next_dose_at?: string | null;
}

export interface FeedingStatsSummary {
  totalFeedingsToday: number;
  totalDurationSecondsToday: number;
  avgDurationMinutes: number;
  avgRestIntervalMinutes: number;
  leftBreastCount: number;
  rightBreastCount: number;
  bottleMaternalCount: number;
  bottleFormulaCount: number;
  bottleCount: number;
  mixedCount: number;
  leftPercentage: number;
  rightPercentage: number;
  bottleMaternalPercentage: number;
  bottleFormulaPercentage: number;
  bottlePercentage: number;
  lastFeeding?: Feeding | null;
}

export interface ActiveFeedingSession {
  isActive: boolean;
  feedingType: FeedingType;
  activeSide: ActiveFeedingSide;
  startedAt: string | null;
  segmentStartedAt?: number | null;
  sideStartedAt?: number | null; // legacy fallback
  baseLeftSeconds?: number;
  baseRightSeconds?: number;
  baseBottleMaternalSeconds?: number;
  baseBottleFormulaSeconds?: number;
  leftSeconds: number;
  rightSeconds: number;
  bottleMaternalSeconds: number;
  bottleFormulaSeconds: number;
  amountMaternalMl: number | null;
  amountFormulaMl: number | null;
  amountMl: number | null;
  bottleMilkType: BottleMilkType | null;
  notes: string;
}

// ------------------------------------------------------------------------------
// SLEEP DOMAIN TYPES
// ------------------------------------------------------------------------------

export interface SleepLog {
  id: string;
  user_id?: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSleepDTO {
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  notes?: string | null;
}

export interface ActiveSleepSession {
  isActive: boolean;
  isPaused: boolean;
  startedAt: string | null;
  segmentStartedAt?: number | null;
  lastTickTime?: number | null; // legacy fallback
  baseSeconds?: number;
  elapsedSeconds: number;
  notes: string;
}

export type TimeframePeriod = 'day' | 'week' | 'month';

export interface DaySleepMetric {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Lun 18", "Hoy", "23 Ago", etc.
  dayShort: string; // "L", "M", "X", "J", "V", "S", "D"
  totalSleepSeconds: number;
  totalSleepFormatted: string;
  totalHoursDecimal: number;
  napCount: number;
  isTargetDay?: boolean;
}

export interface PeriodSleepStatsSummary {
  period: TimeframePeriod;
  targetDate: string; // YYYY-MM-DD
  periodLabel: string; // e.g. "Hoy, 23 Ago", "Semana: 17 Ago - 23 Ago", "Agosto 2026"
  totalSleepSeconds: number;
  totalSleepFormatted: string;
  dailyAvgSleepFormatted: string;
  dailyAvgHoursDecimal: number;
  napCount: number;
  dailyAvgNaps: number;
  avgNapMinutes: number;
  longestNapMinutes: number;
  dailyBreakdown: DaySleepMetric[];
  logs: SleepLog[];
}

export interface SleepStatsSummary {
  totalSleepSecondsToday: number;
  totalSleepFormatted: string;
  napCountToday: number;
  avgNapMinutesToday: number;
  longestNapMinutesToday: number;
  lastSleep?: SleepLog | null;
  selectedDate?: string;
}

// ------------------------------------------------------------------------------
// WEIGHT DOMAIN TYPES
// ------------------------------------------------------------------------------

export interface WeightLog {
  id: string;
  user_id?: string | null;
  weight_kg: number;
  recorded_at: string; // ISO 8601 string
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWeightDTO {
  weight_kg: number;
  recorded_at: string;
  notes?: string | null;
}

export interface UpdateWeightDTO {
  id: string;
  weight_kg: number;
  recorded_at: string;
  notes?: string | null;
}

export type WeightTimeframePeriod = 'week' | 'month' | 'year' | 'all';

export interface WeightChartPoint {
  id: string;
  dateKey: string; // YYYY-MM-DD
  dateLabel: string; // "18 Ago", "Hoy", etc.
  fullDateLabel: string; // "18 de agosto de 2026, 10:30"
  weightKg: number;
  weightGrams: number;
  diffFromPrevGrams: number | null;
  notes?: string | null;
  rawLog: WeightLog;
}

export interface WeightStatsSummary {
  latestWeightKg: number | null;
  latestWeightGrams: number | null;
  latestRecordedAt: string | null;
  diffRecentGrams: number | null; // diff compared to previous weigh-in
  diffTotalGrams: number | null;  // diff compared to first recorded weigh-in
  firstWeightKg: number | null;
  totalLogsCount: number;
}

