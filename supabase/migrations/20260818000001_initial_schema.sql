-- Migration 01: Initial Schema (Feedings, Medications, Medication Logs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE feeding_type_enum AS ENUM ('breast', 'bottle');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE breast_side_enum AS ENUM ('left', 'right', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.feedings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    feeding_type feeding_type_enum NOT NULL DEFAULT 'breast',
    breast_side breast_side_enum NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    duration_left_seconds INTEGER NOT NULL DEFAULT 0,
    duration_right_seconds INTEGER NOT NULL DEFAULT 0,
    amount_ml NUMERIC(6, 2) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_duration_non_negative CHECK (duration_seconds >= 0),
    CONSTRAINT chk_duration_left_non_negative CHECK (duration_left_seconds >= 0),
    CONSTRAINT chk_duration_right_non_negative CHECK (duration_right_seconds >= 0),
    CONSTRAINT chk_amount_ml_positive CHECK (amount_ml IS NULL OR amount_ml >= 0),
    CONSTRAINT chk_chronological_times CHECK (ended_at >= started_at)
);

CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name VARCHAR(120) NOT NULL,
    dose_description VARCHAR(100) NULL,
    interval_hours INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_interval_hours_positive CHECK (interval_hours > 0)
);

CREATE TABLE IF NOT EXISTS public.medication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    administered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feedings_user_started ON public.feedings (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedings_started_at ON public.feedings (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_medications_user_active ON public.medications (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_med_logs_user_administered ON public.medication_logs (user_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_logs_med_id ON public.medication_logs (medication_id, administered_at DESC);

ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedings access policy" ON public.feedings
    FOR ALL
    USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL))
    WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL));

CREATE POLICY "Medications access policy" ON public.medications
    FOR ALL
    USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL))
    WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL));

CREATE POLICY "Medication logs access policy" ON public.medication_logs
    FOR ALL
    USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL))
    WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL));
