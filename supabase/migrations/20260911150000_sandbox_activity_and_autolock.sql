-- Marketing Sandbox Phase 3A: Activity Tracking & 7-Day Auto-Lock
-- Adds last_meaningful_activity_at column to sandbox_access (starts NULL).
-- Adds atomic touch_sandbox_activity(p_user_id) with 5-minute DB-side debounce.
-- Adds atomic auto_lock_inactive_sandbox_users() to lock ACTIVE users after 7 days of inactivity.
-- Strict service_role-only execution; preserves wallets, orders, and reactivation requests.

-- 1. Pre-check: Ensure functions do not already exist
DO $$
BEGIN
  IF to_regprocedure('public.touch_sandbox_activity(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'SANDBOX_ACTIVITY_OBJECT_EXISTS: public.touch_sandbox_activity(uuid)';
  END IF;

  IF to_regprocedure('public.auto_lock_inactive_sandbox_users()') IS NOT NULL THEN
    RAISE EXCEPTION 'SANDBOX_ACTIVITY_OBJECT_EXISTS: public.auto_lock_inactive_sandbox_users()';
  END IF;
END $$;

-- 2. Add last_meaningful_activity_at column
-- Starts NULL. First activation does NOT populate this column.
ALTER TABLE public.sandbox_access
  ADD COLUMN IF NOT EXISTS last_meaningful_activity_at timestamp with time zone NULL;

-- 3. Partial index to support active auto-lock sweeps
-- Evaluates the latest of last_meaningful_activity_at and changed_at exclusively for ACTIVE rows.
CREATE INDEX IF NOT EXISTS sandbox_access_active_inactivity_idx
  ON public.sandbox_access ((GREATEST(last_meaningful_activity_at, changed_at)))
  WHERE state = 'ACTIVE';

-- 4. Atomic activity touch function
-- Updates last_meaningful_activity_at to now() if:
--   - state is 'ACTIVE'
--   - last_meaningful_activity_at IS NULL or <= now() - 5 minutes (DB-side throttle)
-- Returns true if updated, false if throttled, not active, or not found.
CREATE OR REPLACE FUNCTION public.touch_sandbox_activity(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_updated boolean := false;
BEGIN
  -- Reject NULL input silently (returns false)
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Debounced update: only updates if user is ACTIVE and last activity was >= 5 mins ago (or NULL)
  UPDATE public.sandbox_access
  SET last_meaningful_activity_at = v_now
  WHERE user_id = p_user_id
    AND state = 'ACTIVE'
    AND (
      last_meaningful_activity_at IS NULL
      OR last_meaningful_activity_at <= v_now - interval '5 minutes'
    );

  IF FOUND THEN
    v_updated := true;
  END IF;

  RETURN v_updated;
END;
$$;

-- 5. Atomic 7-day auto-lock function
-- Finds ACTIVE users whose baseline inactivity exceeds 7 days.
-- Inactivity baseline: latest of last_meaningful_activity_at and changed_at
-- Transitions ACTIVE -> LOCKED only.
-- Does NOT touch profiles.is_tester, sandbox_wallets, sandbox_orders, or sandbox_reactivation_requests.
-- Returns table of locked user_ids and their lock timestamps.
CREATE OR REPLACE FUNCTION public.auto_lock_inactive_sandbox_users()
RETURNS TABLE (
  user_id uuid,
  locked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_cutoff timestamptz := v_now - interval '7 days';
BEGIN
  RETURN QUERY
  UPDATE public.sandbox_access
  SET
    state = 'LOCKED',
    changed_by = NULL,
    changed_at = v_now,
    reason = 'Auto-lock: 7 hari tanpa aktivitas bermakna'
  WHERE sandbox_access.state = 'ACTIVE'
    AND GREATEST(
      sandbox_access.last_meaningful_activity_at,
      sandbox_access.changed_at
    ) < v_cutoff
  RETURNING sandbox_access.user_id, sandbox_access.changed_at;
END;
$$;

-- 6. Access Control (service_role only)
REVOKE ALL ON FUNCTION public.touch_sandbox_activity(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_sandbox_activity(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.auto_lock_inactive_sandbox_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_lock_inactive_sandbox_users() TO service_role;
