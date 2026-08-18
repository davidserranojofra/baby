// ==============================================================================
// BABY TRACKER - STRICT TYPESCRIPT DOMAIN TYPES & DTOs
// ==============================================================================

export type FeedingType = 'breast' | 'bottle';
export type BreastSide = 'left' | 'right' | 'both';

export interface Feeding {
  id: string;
  user_id?: string | null;
  feeding_type: FeedingType;
  breast_side?: BreastSide | null;
  started_at: string; // ISO 8601 string
  ended_at: string;   // ISO 8601 string
  duration_seconds: number;
  duration_left_seconds: number;
  duration_right_seconds: number;
  amount_ml?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedingDTO {
  feeding_type: FeedingType;
  breast_side?: BreastSide | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  duration_left_seconds?: number;
  duration_right_seconds?: number;
  amount_ml?: number | null;
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
  bottleCount: number;
  leftPercentage: number;
  rightPercentage: number;
  bottlePercentage: number;
  lastFeeding?: Feeding | null;
}

export interface ActiveFeedingSession {
  isActive: boolean;
  feedingType: FeedingType;
  activeSide: 'left' | 'right' | null;
  startedAt: string | null;
  sideStartedAt: number | null;
  leftSeconds: number;
  rightSeconds: number;
  amountMl: number | null;
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
  lastTickTime: number | null;
  elapsedSeconds: number;
  notes: string;
}

export interface SleepStatsSummary {
  totalSleepSecondsToday: number;
  totalSleepFormatted: string;
  napCountToday: number;
  avgNapMinutesToday: number;
  longestNapMinutesToday: number;
  lastSleep?: SleepLog | null;
}
