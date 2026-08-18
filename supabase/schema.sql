-- ==============================================================================
-- BABY TRACKER - SUPABASE DATABASE SCHEMA (DDL)
-- Architecture: OWASP Compliant, Strict Constraints, RLS Enabled, Auth-Ready
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DOMAIN TYPES & ENUMS
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

-- 3. TABLE: FEEDINGS (Lactancia materna y biberón)
CREATE TABLE IF NOT EXISTS public.feedings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    
    -- Tipo de alimentación: pecho o biberón
    feeding_type feeding_type_enum NOT NULL DEFAULT 'breast',
    
    -- Detalle de pecho (izquierdo, derecho, o ambos si hubo alternancia)
    breast_side breast_side_enum NULL,
    
    -- Tiempos y duraciones
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    duration_left_seconds INTEGER NOT NULL DEFAULT 0,
    duration_right_seconds INTEGER NOT NULL DEFAULT 0,
    
    -- Biberón (cantidad en ml / onzas)
    amount_ml NUMERIC(6, 2) NULL,
    
    -- Notas y metadatos
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Restricciones de integridad (OWASP Data Validation)
    CONSTRAINT chk_duration_non_negative CHECK (duration_seconds >= 0),
    CONSTRAINT chk_duration_left_non_negative CHECK (duration_left_seconds >= 0),
    CONSTRAINT chk_duration_right_non_negative CHECK (duration_right_seconds >= 0),
    CONSTRAINT chk_amount_ml_positive CHECK (amount_ml IS NULL OR amount_ml >= 0),
    CONSTRAINT chk_chronological_times CHECK (ended_at >= started_at)
);

-- 4. TABLE: MEDICATIONS (Configuración / Catálogo de Medicamentos)
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    
    name VARCHAR(120) NOT NULL,
    dose_description VARCHAR(100) NULL, -- ej. "4 gotas", "2.5 ml"
    interval_hours INTEGER NOT NULL DEFAULT 24, -- frecuencia en horas (ej. 24 para Vitamina D)
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_interval_hours_positive CHECK (interval_hours > 0)
);

-- 5. TABLE: MEDICATION_LOGS (Registro histórico de tomas de medicación)
CREATE TABLE IF NOT EXISTS public.medication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    
    administered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PERFORMANCE & SECURITY INDEXES
CREATE INDEX IF NOT EXISTS idx_feedings_user_started ON public.feedings (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedings_started_at ON public.feedings (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_medications_user_active ON public.medications (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_med_logs_user_administered ON public.medication_logs (user_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_logs_med_id ON public.medication_logs (medication_id, administered_at DESC);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- OWASP A01: Broken Access Control Mitigation
ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Politicas para FEEDINGS
-- Modo autenticado: el usuario solo lee/escribe sus propios registros.
-- Modo anónimo/guest: registros con user_id IS NULL son accesibles para el cliente MVP.
CREATE POLICY "Feedings access policy" ON public.feedings
    FOR ALL
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    );

-- Politicas para MEDICATIONS
CREATE POLICY "Medications access policy" ON public.medications
    FOR ALL
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    );

-- Politicas para MEDICATION_LOGS
CREATE POLICY "Medication logs access policy" ON public.medication_logs
    FOR ALL
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    );
