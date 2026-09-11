-- Marketing Sandbox: Self-service first activation.
-- Allows a qualifying Member (NONE state) to activate their own Sandbox access.
-- LOCKED and REVOKED transitions remain management-controlled only.
-- Does NOT touch reactivation requests, wallet bootstrap, or financial primitives.

DO $$
BEGIN
  IF to_regprocedure('public.activate_sandbox_self_service(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'SANDBOX_SELF_ACTIVATION_OBJECT_EXISTS: public.activate_sandbox_self_service(uuid)';
  END IF;
END $$;

CREATE FUNCTION public.activate_sandbox_self_service(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target   public.profiles%ROWTYPE;
  v_access   public.sandbox_access%ROWTYPE;
  v_access_exists boolean;
  v_now      timestamptz := now();
  v_role     text;
BEGIN
  -- 1. Reject NULL input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'SANDBOX_ACTIVATION_INPUT_INVALID';
  END IF;

  -- 2. Lock profiles row; reject missing profile
  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SANDBOX_ACTIVATION_USER_NOT_FOUND';
  END IF;

  -- 3. Reject management persona
  v_role := lower(trim(coalesce(v_target.role, '')));
  IF v_role IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'MANAGEMENT_PERSONA_NOT_ELIGIBLE';
  END IF;

  -- 4. Lock existing sandbox_access row (if any)
  SELECT *
  INTO v_access
  FROM public.sandbox_access
  WHERE user_id = p_user_id
  FOR UPDATE;
  v_access_exists := FOUND;

  -- 5. Already ACTIVE — return no-op; do not touch tester history
  IF v_access_exists AND v_access.state = 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'success',      true,
      'no_op',        true,
      'access_state', 'ACTIVE'
    );
  END IF;

  -- 6. LOCKED or REVOKED — self-service is not permitted by contract
  IF v_access_exists AND v_access.state IN ('LOCKED', 'REVOKED') THEN
    RAISE EXCEPTION 'SANDBOX_ACTIVATION_ACCESS_LOCKED_OR_REVOKED';
  END IF;

  -- 7. NONE path: no sandbox_access row exists
  --    Update profiles: tester persona + history
  UPDATE public.profiles
  SET
    is_tester        = true,
    tester_since     = coalesce(tester_since, v_now),
    tester_updated_at = v_now
  WHERE id = p_user_id;

  --    Insert sandbox_access; PK uniqueness guards against duplicate on concurrent call
  INSERT INTO public.sandbox_access (
    user_id,
    state,
    changed_by,
    changed_at,
    reason
    -- created_at: DEFAULT now()
    -- updated_at: DEFAULT now()
  )
  VALUES (
    p_user_id,
    'ACTIVE',
    NULL,                              -- self-service: no management actor
    v_now,
    'Self-service first activation'
  );

  RETURN jsonb_build_object(
    'success',          true,
    'no_op',            false,
    'user_id',          p_user_id,
    'is_tester',        true,
    'tester_since',     coalesce(v_target.tester_since, v_now),
    'tester_updated_at', v_now,
    'access_state',     'ACTIVE'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_sandbox_self_service(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_sandbox_self_service(uuid) TO service_role;

