-- ==============================================================================
-- MIGRATION: 20260821_strict_rls_policies.sql
-- PURPOSE: Enforce strict OWASP A01 (Broken Access Control) multi-tenant isolation
-- ==============================================================================

-- 1. Ensure user_id defaults to auth.uid() on all domain tables
ALTER TABLE public.feedings 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.medications 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.medication_logs 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.sleep_logs 
    ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Drop legacy permissive/anonymous policies
DROP POLICY IF EXISTS "Feedings access policy" ON public.feedings;
DROP POLICY IF EXISTS "Medications access policy" ON public.medications;
DROP POLICY IF EXISTS "Medication logs access policy" ON public.medication_logs;
DROP POLICY IF EXISTS "Sleep access policy" ON public.sleep_logs;

-- 3. Create Strict RLS Policies for FEEDINGS
CREATE POLICY "Feedings user isolation policy" ON public.feedings
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4. Create Strict RLS Policies for MEDICATIONS
CREATE POLICY "Medications user isolation policy" ON public.medications
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 5. Create Strict RLS Policies for MEDICATION_LOGS
CREATE POLICY "Medication logs user isolation policy" ON public.medication_logs
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 6. Create Strict RLS Policies for SLEEP_LOGS
CREATE POLICY "Sleep user isolation policy" ON public.sleep_logs
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
