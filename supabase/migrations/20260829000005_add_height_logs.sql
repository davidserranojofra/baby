-- ==============================================================================
-- Migration 05: Add Height Logs Table (Controles de Altura / Talla)
-- Architecture: OWASP Compliant, Strict Constraints, RLS Enabled, User-Isolated
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.height_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    
    height_cm NUMERIC(5, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_height_positive CHECK (height_cm > 0 AND height_cm < 250)
);

-- Performance & Security Indexes
CREATE INDEX IF NOT EXISTS idx_height_logs_user_recorded ON public.height_logs (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_height_logs_recorded_at ON public.height_logs (recorded_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.height_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Height logs access policy" ON public.height_logs
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
