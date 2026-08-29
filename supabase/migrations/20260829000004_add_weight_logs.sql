-- ==============================================================================
-- Migration 04: Add Weight Logs Table (Controles de Peso)
-- Architecture: OWASP Compliant, Strict Constraints, RLS Enabled, User-Isolated
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    
    weight_kg NUMERIC(5, 3) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_weight_positive CHECK (weight_kg > 0 AND weight_kg < 100)
);

-- Performance & Security Indexes
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_recorded ON public.weight_logs (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_logs_recorded_at ON public.weight_logs (recorded_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weight logs access policy" ON public.weight_logs
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
