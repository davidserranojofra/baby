-- Migration 02: Add Sleep Logs Table
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_sleep_duration_non_negative CHECK (duration_seconds >= 0),
    CONSTRAINT chk_sleep_chronological_times CHECK (ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_sleep_user_started ON public.sleep_logs (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_started_at ON public.sleep_logs (started_at DESC);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sleep access policy" ON public.sleep_logs
    FOR ALL
    USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL))
    WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL));
