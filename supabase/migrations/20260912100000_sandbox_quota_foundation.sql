-- Migration: 20260912100000_sandbox_quota_foundation.sql
-- Purpose: Phase 3B.1 Marketing Sandbox Quota Foundation
-- 1. Create public.sandbox_sessions table (service_role only, no PII)
-- 2. Create index on (user_id, created_at DESC)
-- 3. Create public.record_sandbox_session_if_allowed (atomic session quota gate)
-- 4. Create public.create_sandbox_order_guarded (atomic simulation quota + order insertion TOCTOU guard)
-- 5. Create public.get_sandbox_quota_usage (server-authoritative usage reader)
--
-- Security:
--   - SECURITY DEFINER with search_path = public, pg_temp
--   - service_role execution only
--   - Revoked from PUBLIC, anon, authenticated

DO $$
BEGIN
  IF to_regclass('public.sandbox_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'OBJECT_ALREADY_EXISTS: public.sandbox_sessions';
  END IF;

  IF to_regprocedure('public.record_sandbox_session_if_allowed(uuid, integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'OBJECT_ALREADY_EXISTS: public.record_sandbox_session_if_allowed(uuid, integer)';
  END IF;

  IF to_regprocedure('public.create_sandbox_order_guarded(uuid, jsonb, integer, integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'OBJECT_ALREADY_EXISTS: public.create_sandbox_order_guarded(uuid, jsonb, integer, integer)';
  END IF;

  IF to_regprocedure('public.get_sandbox_quota_usage(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'OBJECT_ALREADY_EXISTS: public.get_sandbox_quota_usage(uuid)';
  END IF;
END $$;

-- 1. Sandbox Sessions Table (Lean counter / timestamp only, zero PII)
CREATE TABLE public.sandbox_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Index for user-scoped day boundary queries
CREATE INDEX idx_sandbox_sessions_user_created
  ON public.sandbox_sessions (user_id, created_at DESC);

-- Enable RLS and isolate strictly to service_role
ALTER TABLE public.sandbox_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sandbox_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.sandbox_sessions TO service_role;

-- 3. Atomic Session Quota Gate
CREATE OR REPLACE FUNCTION public.record_sandbox_session_if_allowed(
  p_user_id uuid,
  p_daily_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_access public.sandbox_access%ROWTYPE;
  v_today_start timestamptz;
  v_session_count integer;
  v_session_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: user_id is required';
  END IF;

  IF p_daily_limit IS NULL OR p_daily_limit <= 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT: daily_limit must be greater than 0';
  END IF;

  -- Lock user sandbox_access row exclusively to serialize concurrency
  SELECT *
  INTO v_access
  FROM public.sandbox_access
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'code', 'SANDBOX_ACCESS_NOT_FOUND',
      'message', 'Akses Sandbox tidak ditemukan'
    );
  END IF;

  IF v_access.state <> 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'code', 'SANDBOX_ACCESS_NOT_ACTIVE',
      'message', 'Akses Sandbox tidak aktif'
    );
  END IF;

  -- Calculate calendar day start in Asia/Jakarta (WIB)
  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';

  -- Count sessions created today in Asia/Jakarta
  SELECT count(*)::integer
  INTO v_session_count
  FROM public.sandbox_sessions
  WHERE user_id = p_user_id
    AND created_at >= v_today_start;

  -- Quota check
  IF v_session_count >= p_daily_limit THEN
    RETURN jsonb_build_object(
      'success', true,
      'allowed', false,
      'code', 'SESSION_QUOTA_EXCEEDED',
      'used_today', v_session_count,
      'daily_limit', p_daily_limit,
      'message', 'Batas sesi harian telah tercapai. Silakan kembali besok.'
    );
  END IF;

  -- Insert session record
  INSERT INTO public.sandbox_sessions (user_id)
  VALUES (p_user_id)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'allowed', true,
    'session_id', v_session_id,
    'used_today', v_session_count + 1,
    'daily_limit', p_daily_limit,
    'message', 'Sesi Sandbox berhasil dicatat'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_sandbox_session_if_allowed(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_sandbox_session_if_allowed(uuid, integer) TO service_role;

-- 4. Atomic Simulation Quota + Order Insertion Guard (TOCTOU Protection)
CREATE OR REPLACE FUNCTION public.create_sandbox_order_guarded(
  p_user_id uuid,
  p_order_data jsonb,
  p_daily_limit integer,
  p_hourly_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_access public.sandbox_access%ROWTYPE;
  v_today_start timestamptz;
  v_one_hour_ago timestamptz;
  v_daily_count integer;
  v_hourly_count integer;
  v_order_id text;
  v_sku text;
  v_product_name text;
  v_item_label text;
  v_category text;
  v_customer_no text;
  v_price numeric;
  v_email text;
  v_new_order_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: user_id is required';
  END IF;

  IF p_order_data IS NULL OR jsonb_typeof(p_order_data) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_INPUT: order_data must be a json object';
  END IF;

  IF p_daily_limit IS NULL OR p_daily_limit <= 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT: daily_limit must be greater than 0';
  END IF;

  IF p_hourly_limit IS NULL OR p_hourly_limit <= 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT: hourly_limit must be greater than 0';
  END IF;

  -- 1. Lock sandbox_access exclusively for user
  SELECT *
  INTO v_access
  FROM public.sandbox_access
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'code', 'SANDBOX_ACCESS_NOT_FOUND',
      'message', 'Akses Sandbox tidak ditemukan'
    );
  END IF;

  IF v_access.state <> 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'code', 'SANDBOX_ACCESS_NOT_ACTIVE',
      'message', 'Akses Sandbox tidak aktif'
    );
  END IF;

  -- 2. Calculate time boundaries
  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';
  v_one_hour_ago := now() - INTERVAL '1 hour';

  -- 3. Count user simulations in calendar day Asia/Jakarta
  SELECT count(*)::integer
  INTO v_daily_count
  FROM public.sandbox_orders
  WHERE user_id = p_user_id
    AND created_at >= v_today_start;

  IF v_daily_count >= p_daily_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'code', 'SIMULATION_QUOTA_EXCEEDED',
      'daily_used', v_daily_count,
      'daily_limit', p_daily_limit,
      'message', 'Batas simulasi transaksi harian telah tercapai. Silakan coba lagi besok.'
    );
  END IF;

  -- 4. Count user simulations in rolling 1-hour window
  SELECT count(*)::integer
  INTO v_hourly_count
  FROM public.sandbox_orders
  WHERE user_id = p_user_id
    AND created_at >= v_one_hour_ago;

  IF v_hourly_count >= p_hourly_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'code', 'HOURLY_SIMULATION_BURST_EXCEEDED',
      'hourly_used', v_hourly_count,
      'hourly_limit', p_hourly_limit,
      'message', 'Terlalu banyak simulasi dalam waktu singkat. Silakan coba beberapa saat lagi.'
    );
  END IF;

  -- 5. Extract trusted payload fields
  v_order_id := p_order_data->>'order_id';
  v_sku := p_order_data->>'sku';
  v_product_name := p_order_data->>'product_name';
  v_item_label := p_order_data->>'item_label';
  v_category := p_order_data->>'category';
  v_customer_no := p_order_data->>'customer_no';
  v_price := (p_order_data->>'price')::numeric;
  v_email := p_order_data->>'email';

  IF v_order_id IS NULL OR v_sku IS NULL OR v_customer_no IS NULL OR v_price IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: missing required order attributes in order_data';
  END IF;

  -- 6. Atomically insert Sandbox Order while holding the row lock
  INSERT INTO public.sandbox_orders (
    order_id,
    user_id,
    email,
    sku,
    product_name,
    item_label,
    category,
    customer_no,
    price,
    total_amount,
    used_balance,
    buy_price,
    payment_method,
    status,
    provider_used
  )
  VALUES (
    v_order_id,
    p_user_id,
    v_email,
    v_sku,
    v_product_name,
    v_item_label,
    v_category,
    v_customer_no,
    v_price,
    v_price,
    v_price::bigint,
    v_price,
    'KOIN_SANDBOX',
    'Pending',
    'SANDBOX_SIMULATOR'
  )
  RETURNING id INTO v_new_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'allowed', true,
    'id', v_new_order_id,
    'order_id', v_order_id,
    'daily_used', v_daily_count + 1,
    'daily_limit', p_daily_limit,
    'hourly_used', v_hourly_count + 1,
    'hourly_limit', p_hourly_limit,
    'message', 'Pesanan simulasi berhasil dibuat'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_sandbox_order_guarded(uuid, jsonb, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sandbox_order_guarded(uuid, jsonb, integer, integer) TO service_role;

-- 5. Read-Only Quota Usage Inspector (Zero mutation, zero lock)
CREATE OR REPLACE FUNCTION public.get_sandbox_quota_usage(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today_start timestamptz;
  v_one_hour_ago timestamptz;
  v_session_count integer;
  v_daily_sim_count integer;
  v_hourly_sim_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: user_id is required';
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';
  v_one_hour_ago := now() - INTERVAL '1 hour';

  SELECT count(*)::integer
  INTO v_session_count
  FROM public.sandbox_sessions
  WHERE user_id = p_user_id
    AND created_at >= v_today_start;

  SELECT count(*)::integer
  INTO v_daily_sim_count
  FROM public.sandbox_orders
  WHERE user_id = p_user_id
    AND created_at >= v_today_start;

  SELECT count(*)::integer
  INTO v_hourly_sim_count
  FROM public.sandbox_orders
  WHERE user_id = p_user_id
    AND created_at >= v_one_hour_ago;

  RETURN jsonb_build_object(
    'success', true,
    'sessions_today', v_session_count,
    'simulations_today', v_daily_sim_count,
    'simulations_hourly', v_hourly_sim_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sandbox_quota_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sandbox_quota_usage(uuid) TO service_role;

