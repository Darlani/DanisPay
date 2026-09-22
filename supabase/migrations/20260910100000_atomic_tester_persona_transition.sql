-- Marketing Sandbox Batch 1B: atomic Tester persona transition.
-- This operation changes only profile/access state and request state.

DO $$
BEGIN
  IF to_regprocedure('public.set_tester_persona_atomic(uuid, boolean, uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'BATCH_1B_OBJECT_EXISTS: public.set_tester_persona_atomic(uuid, boolean, uuid)';
  END IF;
END $$;

CREATE FUNCTION public.set_tester_persona_atomic(
  p_user_id uuid,
  p_is_tester boolean,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target public.profiles%ROWTYPE;
  v_actor public.profiles%ROWTYPE;
  v_access public.sandbox_access%ROWTYPE;
  v_access_exists boolean;
  v_now timestamptz := now();
BEGIN
  IF p_user_id IS NULL OR p_is_tester IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'TESTER_PERSONA_INPUT_INVALID';
  END IF;

  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TESTER_PERSONA_TARGET_NOT_FOUND';
  END IF;

  IF lower(trim(coalesce(v_target.role, ''))) IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'MANAGEMENT_PERSONA_NOT_ELIGIBLE';
  END IF;

  SELECT *
  INTO v_actor
  FROM public.profiles
  WHERE id = p_actor_user_id
  FOR UPDATE;

  IF NOT FOUND OR lower(trim(coalesce(v_actor.role, ''))) NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'MANAGEMENT_ACTOR_REQUIRED';
  END IF;

  SELECT *
  INTO v_access
  FROM public.sandbox_access
  WHERE user_id = p_user_id
  FOR UPDATE;
  v_access_exists := FOUND;

  IF p_is_tester THEN
    UPDATE public.profiles
    SET is_tester = true,
        tester_since = coalesce(tester_since, v_now),
        tester_updated_at = v_now
    WHERE id = p_user_id;

    IF v_access_exists THEN
      UPDATE public.sandbox_access
      SET state = 'ACTIVE',
          changed_by = p_actor_user_id,
          changed_at = v_now,
          reason = 'Tester access granted by management',
          updated_at = v_now
      WHERE user_id = p_user_id;
    ELSE
      INSERT INTO public.sandbox_access (user_id, state, changed_by, changed_at, reason)
      VALUES (p_user_id, 'ACTIVE', p_actor_user_id, v_now, 'Tester access granted by management');
    END IF;
    UPDATE public.sandbox_reactivation_requests
    SET state = 'CANCELLED',
        reviewed_by = p_actor_user_id,
        reviewed_at = v_now
    WHERE user_id = p_user_id
      AND state = 'PENDING';

  ELSE
    UPDATE public.profiles
    SET is_tester = false,
        tester_updated_at = v_now
    WHERE id = p_user_id;

    IF v_access_exists THEN
      UPDATE public.sandbox_access
      SET state = 'LOCKED',
          changed_by = p_actor_user_id,
          changed_at = v_now,
          reason = 'Tester converted to Member by management',
          updated_at = v_now
      WHERE user_id = p_user_id;
    ELSE
      INSERT INTO public.sandbox_access (user_id, state, changed_by, changed_at, reason)
      VALUES (p_user_id, 'LOCKED', p_actor_user_id, v_now, 'Tester converted to Member by management');
    END IF;

    UPDATE public.sandbox_reactivation_requests
    SET state = 'CANCELLED',
        reviewed_by = p_actor_user_id,
        reviewed_at = v_now
    WHERE user_id = p_user_id
      AND state = 'PENDING';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'is_tester', p_is_tester,
    'tester_since', CASE WHEN p_is_tester THEN coalesce(v_target.tester_since, v_now) ELSE v_target.tester_since END,
    'tester_updated_at', v_now,
    'access_state', CASE WHEN p_is_tester THEN 'ACTIVE' ELSE 'LOCKED' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_tester_persona_atomic(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_tester_persona_atomic(uuid, boolean, uuid) TO service_role;