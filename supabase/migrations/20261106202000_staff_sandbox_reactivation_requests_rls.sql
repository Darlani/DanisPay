-- Migration: 20261106202000_staff_sandbox_reactivation_requests_rls.sql
-- Description: Allow Admin and Manager roles to SELECT sandbox_reactivation_requests for Realtime dashboard sync

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sandbox_reactivation_requests'
      AND policyname = 'Staff can view all sandbox reactivation requests'
  ) THEN
    CREATE POLICY "Staff can view all sandbox reactivation requests"
    ON public.sandbox_reactivation_requests
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND lower(trim(coalesce(profiles.role, ''))) IN ('admin', 'manager', 'lead admin')
      )
    );
  END IF;
END $$;
