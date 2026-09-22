-- Migration: 20260915100000_sandbox_funnel_events.sql
-- Purpose: Phase 5A.1 Marketing Sandbox Funnel Events Telemetry Foundation
-- 1. Pre-check: Ensure table does not already exist
-- 2. Create public.sandbox_funnel_events table (service_role only, no PII, no financial balances)
-- 3. Create indexes:
--    - idx_sandbox_funnel_meaningful_activity: (user_id, occurred_at) WHERE is_meaningful = true
--    - idx_sandbox_funnel_event_occurred: (event_name, occurred_at)
--    - idx_sandbox_funnel_anon_stitching: (anonymous_id) WHERE anonymous_id IS NOT NULL
-- 4. Enable RLS and grant SELECT, INSERT strictly to service_role (revoke from PUBLIC, anon, authenticated)

DO $$
BEGIN
  IF to_regclass('public.sandbox_funnel_events') IS NOT NULL THEN
    RAISE EXCEPTION 'OBJECT_ALREADY_EXISTS: public.sandbox_funnel_events';
  END IF;
END $$;

-- 1. Sandbox Funnel Events Table
-- Stores user journey and discovery events for marketing analysis.
-- Strictly non-financial; balances and live money data are excluded.
CREATE TABLE public.sandbox_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id text NULL,
  event_name text NOT NULL,
  is_meaningful boolean NOT NULL DEFAULT false,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NULL,
  medium text NULL,
  campaign text NULL,
  metadata jsonb NULL
);

-- Comments describing purpose and security
COMMENT ON TABLE public.sandbox_funnel_events IS
  'Telemetry foundation for Marketing Sandbox funnel, attribution, and retention. Strictly service_role managed.';
COMMENT ON COLUMN public.sandbox_funnel_events.user_id IS
  'Authenticated user reference. NULL for anonymous pre-login discovery events.';
COMMENT ON COLUMN public.sandbox_funnel_events.anonymous_id IS
  'Opaque visitor identifier from first-party dapay_anon_id cookie for pre-auth stitching.';
COMMENT ON COLUMN public.sandbox_funnel_events.is_meaningful IS
  'Fast boolean flag identifying qualifying meaningful activity (catalog view, margin inspection, order review).';

-- 2. Indexes

-- Fast query index for 14-day retention (distinct activity days)
CREATE INDEX idx_sandbox_funnel_meaningful_activity
  ON public.sandbox_funnel_events (user_id, occurred_at)
  WHERE is_meaningful = true;

-- Query index for funnel stage progression analysis
CREATE INDEX idx_sandbox_funnel_event_occurred
  ON public.sandbox_funnel_events (event_name, occurred_at);

-- Query index for stitching anonymous discovery events to authenticated user
CREATE INDEX idx_sandbox_funnel_anon_stitching
  ON public.sandbox_funnel_events (anonymous_id)
  WHERE anonymous_id IS NOT NULL;

-- 3. Security: Enable RLS and isolate strictly to service_role
ALTER TABLE public.sandbox_funnel_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sandbox_funnel_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.sandbox_funnel_events TO service_role;

