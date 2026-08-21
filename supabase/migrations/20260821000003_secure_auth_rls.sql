-- ==============================================================================
-- Migration 03: Secure Auth RLS & Enforce User Isolation
-- Architecture: OWASP Compliant, Zero Trust Data Isolation, BOLA Prevention
-- ==============================================================================

-- 1. Ensure user_id DEFAULT auth.uid() across all tables
ALTER TABLE public.feedings 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.medications 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.medication_logs 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.sleep_logs 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Drop existing loose RLS policies allowing anonymous access
DROP POLICY IF EXISTS "Feedings access policy" ON public.feedings;
DROP POLICY IF EXISTS "Medications access policy" ON public.medications;
DROP POLICY IF EXISTS "Medication logs access policy" ON public.medication_logs;
DROP POLICY IF EXISTS "Sleep access policy" ON public.sleep_logs;

-- 3. Re-create strict RLS policies (Strict Authenticated User Isolation)
CREATE POLICY "Feedings access policy" ON public.feedings
    FOR ALL
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Medications access policy" ON public.medications
    FOR ALL
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Medication logs access policy" ON public.medication_logs
    FOR ALL
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Sleep access policy" ON public.sleep_logs
    FOR ALL
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
