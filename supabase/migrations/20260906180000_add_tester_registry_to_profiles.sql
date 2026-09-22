-- Migration: 20260906180000_add_tester_registry_to_profiles.sql
-- Description: Add tester registry tracking columns to public.profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tester_since TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tester_updated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.tester_since IS 'Timestamp when member was first designated as an authorized tester';
COMMENT ON COLUMN public.profiles.tester_updated_at IS 'Timestamp when tester status was last updated';

-- Backfill existing active testers if any exist
UPDATE public.profiles
SET tester_since = COALESCE(tester_since, now()),
    tester_updated_at = COALESCE(tester_updated_at, now())
WHERE is_tester = true AND tester_since IS NULL;
