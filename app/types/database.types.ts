export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      feedings: {
        Row: {
          id: string
          user_id: string | null
          feeding_type: 'breast' | 'bottle'
          breast_side: 'left' | 'right' | 'both' | null
          started_at: string
          ended_at: string
          duration_seconds: number
          duration_left_seconds: number
          duration_right_seconds: number
          amount_ml: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          feeding_type?: 'breast' | 'bottle'
          breast_side?: 'left' | 'right' | 'both' | null
          started_at?: string
          ended_at?: string
          duration_seconds?: number
          duration_left_seconds?: number
          duration_right_seconds?: number
          amount_ml?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          feeding_type?: 'breast' | 'bottle'
          breast_side?: 'left' | 'right' | 'both' | null
          started_at?: string
          ended_at?: string
          duration_seconds?: number
          duration_left_seconds?: number
          duration_right_seconds?: number
          amount_ml?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      medications: {
        Row: {
          id: string
          user_id: string | null
          name: string
          dose_description: string | null
          interval_hours: number
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          dose_description?: string | null
          interval_hours?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          dose_description?: string | null
          interval_hours?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      medication_logs: {
        Row: {
          id: string
          user_id: string | null
          medication_id: string
          administered_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          medication_id: string
          administered_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          medication_id?: string
          administered_at?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
