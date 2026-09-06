-- Migration: 20260906190000_migrate_sandbox_orders_table.sql
-- Purpose:
-- 1. Create public.sandbox_orders with exact 1:1 schema compatibility with public.orders (42 columns)
-- 2. Add indexes, constraints, trigger, and RLS to public.sandbox_orders
-- 3. Copy existing 41 Sandbox rows from public.orders (WHERE is_sandbox = true) into public.sandbox_orders
-- 4. Retarget Sandbox atomic financial RPCs to public.sandbox_orders
-- 5. Update create_pending_order_from_reservation to route Sandbox orders to public.sandbox_orders while preserving unique-code reservation lifecycle
-- 6. KEEP public.orders.is_sandbox intact for backward compatibility during phased migration

-- =============================================================================
-- 1. CREATE public.sandbox_orders TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sandbox_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE,
  product_name text,
  item_label text,
  price numeric,
  status text DEFAULT 'Pending'::text,
  user_contact text,
  created_at timestamp with time zone DEFAULT now(),
  customer_no text,
  referred_by text REFERENCES public.profiles(referral_code) ON DELETE SET NULL,
  email text,
  category text,
  unique_code integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  voucher_amount numeric DEFAULT 0,
  buy_price numeric DEFAULT 0,
  voucher_code text,
  ip_address text,
  device_id text,
  payment_method text,
  sku text,
  used_balance bigint DEFAULT 0,
  cashback numeric DEFAULT 0,
  referral_commission numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  raw_tagihan numeric DEFAULT 0,
  "desc" jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  notes text,
  api_ref_id text,
  vendor_sku text,
  sn text,
  customer_name text,
  segment_power text,
  stand_meter text,
  product_type text DEFAULT 'provider'::text,
  manual_product_id uuid,
  qris_string text,
  idempotency_key uuid,
  provider_used text,
  provider_ref_id text
);

-- Indexes for sandbox_orders
CREATE INDEX IF NOT EXISTS idx_sandbox_orders_order_id ON public.sandbox_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_orders_user_id ON public.sandbox_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_orders_status ON public.sandbox_orders(status);
CREATE INDEX IF NOT EXISTS idx_sandbox_orders_created_at ON public.sandbox_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_orders_sku ON public.sandbox_orders(sku);

-- Attach update_updated_at_column trigger if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_sandbox_orders_updated_at ON public.sandbox_orders;
    CREATE TRIGGER update_sandbox_orders_updated_at
    BEFORE UPDATE ON public.sandbox_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS on sandbox_orders
ALTER TABLE public.sandbox_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tester can read own sandbox orders" ON public.sandbox_orders;
CREATE POLICY "Tester can read own sandbox orders"
ON public.sandbox_orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_tester = true
  )
);

-- Service role full access bypasses RLS automatically in Supabase, but explicit policy guarantees security
DROP POLICY IF EXISTS "Service role full access on sandbox orders" ON public.sandbox_orders;
CREATE POLICY "Service role full access on sandbox orders"
ON public.sandbox_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 2. MIGRATE EXISTING SANDBOX ORDERS (IDEMPOTENT COPY)
-- =============================================================================
INSERT INTO public.sandbox_orders (
  id, order_id, product_name, item_label, price, status, user_contact,
  created_at, customer_no, referred_by, email, category, unique_code,
  total_amount, voucher_amount, buy_price, voucher_code, ip_address,
  device_id, payment_method, sku, used_balance, cashback,
  referral_commission, discount, user_id, raw_tagihan, "desc",
  updated_at, notes, api_ref_id, vendor_sku, sn, customer_name,
  segment_power, stand_meter, product_type, manual_product_id,
  qris_string, idempotency_key, provider_used, provider_ref_id
)
SELECT
  id, order_id, product_name, item_label, price, status, user_contact,
  created_at, customer_no, referred_by, email, category, unique_code,
  total_amount, voucher_amount, buy_price, voucher_code, ip_address,
  device_id, payment_method, sku, used_balance, cashback,
  referral_commission, discount, user_id, raw_tagihan, "desc",
  updated_at, notes, api_ref_id, vendor_sku, sn, customer_name,
  segment_power, stand_meter, product_type, manual_product_id,
  qris_string, idempotency_key, provider_used, provider_ref_id
FROM public.orders
WHERE is_sandbox = true
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- 3. RETARGET ATOMIC FINANCIAL RPCS TO public.sandbox_orders
-- =============================================================================

-- 3.1 EXECUTE SANDBOX COIN PAYMENT ATOMIC
CREATE OR REPLACE FUNCTION public.execute_sandbox_coin_payment_atomic(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_coin_needed bigint;
  v_cur_bal bigint;
  v_final_bal bigint;
  v_existing_log record;
BEGIN
  -- 1. Lock and fetch order from public.sandbox_orders
  SELECT id, order_id, user_id, email, used_balance, product_name, status, notes
  INTO v_order
  FROM public.sandbox_orders
  WHERE (id::text = p_order_id OR order_id = p_order_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ORDER_NOT_FOUND',
      'message', 'Sandbox order tidak ditemukan'
    );
  END IF;

  -- Status invariant check: Payment is only valid for Pending, Diproses, or Berhasil
  IF v_order.status NOT IN ('Pending', 'Diproses', 'Berhasil') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS_FOR_COIN_PAYMENT',
      'current_status', v_order.status,
      'message', 'Status order tidak sah untuk pemotongan koin: ' || coalesce(v_order.status, 'NULL')
    );
  END IF;

  v_coin_needed := coalesce(v_order.used_balance, 0);

  IF v_coin_needed <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'debited_amount', 0,
      'already_paid', true,
      'message', 'Order tidak menggunakan koin'
    );
  END IF;

  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'USER_ID_NULL',
      'message', 'Order tidak memiliki user_id'
    );
  END IF;

  -- 2. Idempotency check: Already paid in sandbox_balance_logs
  SELECT id, final_balance INTO v_existing_log
  FROM public.sandbox_balance_logs
  WHERE user_id = v_order.user_id
    AND type = 'Payment'
    AND description ILIKE '%#' || v_order.order_id || '%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'debited_amount', v_coin_needed,
      'remaining_balance', v_existing_log.final_balance,
      'already_paid', true,
      'message', 'Order koin sudah terpotong sebelumnya (Idempotent Guard)'
    );
  END IF;

  -- 3. Ensure and lock sandbox wallet
  INSERT INTO public.sandbox_wallets (user_id, balance, created_at, updated_at)
  VALUES (v_order.user_id, 1000000, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_cur_bal
  FROM public.sandbox_wallets
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  IF v_cur_bal < v_coin_needed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_SANDBOX_COIN',
      'available_balance', v_cur_bal,
      'needed_amount', v_coin_needed,
      'message', 'Saldo koin sandbox tidak mencukupi'
    );
  END IF;

  v_final_bal := v_cur_bal - v_coin_needed;

  -- 4. Atomic debit and log insert
  UPDATE public.sandbox_wallets
  SET balance = v_final_bal, updated_at = now()
  WHERE user_id = v_order.user_id;

  INSERT INTO public.sandbox_balance_logs (
    user_id, user_email, amount, type, description,
    initial_balance, final_balance, created_at
  )
  VALUES (
    v_order.user_id,
    v_order.email,
    -v_coin_needed,
    'Payment',
    'Pembayaran Order #' || v_order.order_id || ' (' || coalesce(v_order.product_name, 'Produk Digital') || ') [Sandbox]',
    v_cur_bal,
    v_final_bal,
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.order_id,
    'debited_amount', v_coin_needed,
    'remaining_balance', v_final_bal,
    'already_paid', false,
    'message', 'Payment koin sandbox berhasil'
  );
END;
$$;

-- 3.2 EXECUTE SANDBOX COIN REFUND ATOMIC
CREATE OR REPLACE FUNCTION public.execute_sandbox_coin_refund_atomic(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_coin_refund bigint;
  v_cur_bal bigint;
  v_final_bal bigint;
  v_existing_log record;
  v_has_paid record;
BEGIN
  -- 1. Lock and fetch order from public.sandbox_orders
  SELECT id, order_id, user_id, email, used_balance, status, notes
  INTO v_order
  FROM public.sandbox_orders
  WHERE (id::text = p_order_id OR order_id = p_order_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ORDER_NOT_FOUND',
      'message', 'Sandbox order tidak ditemukan'
    );
  END IF;

  -- Status invariant check: Refund is only valid for Gagal
  IF v_order.status <> 'Gagal' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS_FOR_REFUND',
      'current_status', v_order.status,
      'message', 'Refund hanya diizinkan untuk order berstatus Gagal'
    );
  END IF;

  v_coin_refund := coalesce(v_order.used_balance, 0);

  IF v_coin_refund <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', 0,
      'already_refunded', true,
      'message', 'Order tidak menggunakan koin, tidak ada yang direfund'
    );
  END IF;

  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'USER_ID_NULL',
      'message', 'Order tidak memiliki user_id'
    );
  END IF;

  -- 2. Check if Payment was actually made
  SELECT id INTO v_has_paid
  FROM public.sandbox_balance_logs
  WHERE user_id = v_order.user_id
    AND type = 'Payment'
    AND description ILIKE '%#' || v_order.order_id || '%'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_ORIGINAL_PAYMENT_FOUND',
      'message', 'Tidak ditemukan mutasi pembayaran koin awal untuk order ini'
    );
  END IF;

  -- 3. Idempotency check: Already refunded
  SELECT id, final_balance INTO v_existing_log
  FROM public.sandbox_balance_logs
  WHERE user_id = v_order.user_id
    AND type = 'Refund'
    AND description ILIKE '%#' || v_order.order_id || '%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', v_coin_refund,
      'remaining_balance', v_existing_log.final_balance,
      'already_refunded', true,
      'message', 'Refund koin sandbox sudah diproses sebelumnya (Idempotent Guard)'
    );
  END IF;

  -- 4. Lock sandbox wallet
  INSERT INTO public.sandbox_wallets (user_id, balance, created_at, updated_at)
  VALUES (v_order.user_id, 1000000, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_cur_bal
  FROM public.sandbox_wallets
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  v_final_bal := v_cur_bal + v_coin_refund;

  -- 5. Atomic credit and log insert
  UPDATE public.sandbox_wallets
  SET balance = v_final_bal, updated_at = now()
  WHERE user_id = v_order.user_id;

  INSERT INTO public.sandbox_balance_logs (
    user_id, user_email, amount, type, description,
    initial_balance, final_balance, created_at
  )
  VALUES (
    v_order.user_id,
    v_order.email,
    v_coin_refund,
    'Refund',
    'Refund Otomatis: Pesanan #' || v_order.order_id || ' Gagal [Sandbox]',
    v_cur_bal,
    v_final_bal,
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.order_id,
    'refunded_amount', v_coin_refund,
    'remaining_balance', v_final_bal,
    'already_refunded', false,
    'message', 'Refund koin sandbox berhasil diproses'
  );
END;
$$;

-- 3.3 EXECUTE SANDBOX SUCCESS REWARDS ATOMIC
CREATE OR REPLACE FUNCTION public.execute_sandbox_success_rewards_atomic(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_user record;
  v_referrer record;
  v_cashback_awarded bigint := 0;
  v_welcome_bonus_awarded bigint := 0;
  v_referral_comm_awarded bigint := 0;
  v_referrer_status text := 'NO_REFERRER';
  v_cur_bal bigint;
  v_new_bal bigint;
  v_ref_cur_bal bigint;
  v_ref_new_bal bigint;
  v_order_count integer;
  v_existing_cashback record;
  v_existing_welcome record;
  v_existing_ref record;
BEGIN
  -- 1. Lock and fetch order from public.sandbox_orders
  SELECT id, order_id, user_id, email, used_balance, buy_price, price,
         cashback, category, referred_by, status, notes
  INTO v_order
  FROM public.sandbox_orders
  WHERE (id::text = p_order_id OR order_id = p_order_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ORDER_NOT_FOUND',
      'message', 'Sandbox order tidak ditemukan'
    );
  END IF;

  -- Status invariant check: Rewards only valid for Berhasil
  IF v_order.status <> 'Berhasil' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS_FOR_REWARDS',
      'current_status', v_order.status,
      'message', 'Rewards hanya dapat dieksekusi untuk order berstatus Berhasil'
    );
  END IF;

  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'message', 'Guest order tidak menerima reward member'
    );
  END IF;

  -- Fetch user profile
  SELECT id, email, member_type, is_tester, referred_by
  INTO v_user
  FROM public.profiles
  WHERE id = v_order.user_id;

  -- Ensure user has sandbox wallet
  INSERT INTO public.sandbox_wallets (user_id, balance, created_at, updated_at)
  VALUES (v_user.id, 1000000, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_cur_bal
  FROM public.sandbox_wallets
  WHERE user_id = v_user.id
  FOR UPDATE;

  -- A. CASHBACK EVALUATION
  IF lower(coalesce(v_user.member_type, 'regular')) = 'special' AND coalesce(v_order.cashback, 0) > 0 THEN
    SELECT id INTO v_existing_cashback
    FROM public.sandbox_balance_logs
    WHERE user_id = v_user.id
      AND type = 'Cashback'
      AND description ILIKE '%#' || v_order.order_id || '%'
    LIMIT 1;

    IF NOT FOUND THEN
      v_cashback_awarded := v_order.cashback::bigint;
      v_new_bal := v_cur_bal + v_cashback_awarded;

      UPDATE public.sandbox_wallets
      SET balance = v_new_bal, updated_at = now()
      WHERE user_id = v_user.id;

      INSERT INTO public.sandbox_balance_logs (
        user_id, user_email, amount, type, description,
        initial_balance, final_balance, created_at
      )
      VALUES (
        v_user.id,
        v_user.email,
        v_cashback_awarded,
        'Cashback',
        'Cashback Member Spesial Order #' || v_order.order_id || ' [Sandbox]',
        v_cur_bal,
        v_new_bal,
        timezone('utc'::text, now())
      );

      v_cur_bal := v_new_bal;
    END IF;
  END IF;

  -- B. WELCOME BONUS EVALUATION
  SELECT count(*) INTO v_order_count
  FROM public.sandbox_orders
  WHERE user_id = v_user.id
    AND status = 'Berhasil';

  IF v_order_count = 1 THEN
    SELECT id INTO v_existing_welcome
    FROM public.sandbox_balance_logs
    WHERE user_id = v_user.id
      AND type = 'Bonus'
      AND description ILIKE '%Bonus Transaksi Pertama%'
    LIMIT 1;

    IF NOT FOUND THEN
      v_welcome_bonus_awarded := 2500;
      v_new_bal := v_cur_bal + v_welcome_bonus_awarded;

      UPDATE public.sandbox_wallets
      SET balance = v_new_bal, updated_at = now()
      WHERE user_id = v_user.id;

      INSERT INTO public.sandbox_balance_logs (
        user_id, user_email, amount, type, description,
        initial_balance, final_balance, created_at
      )
      VALUES (
        v_user.id,
        v_user.email,
        v_welcome_bonus_awarded,
        'Bonus',
        'Bonus Transaksi Pertama [Sandbox]',
        v_cur_bal,
        v_new_bal,
        timezone('utc'::text, now())
      );

      v_cur_bal := v_new_bal;
    END IF;
  END IF;

  -- C. REFERRAL COMMISSION EVALUATION
  DECLARE
    v_effective_ref_code text;
  BEGIN
    v_effective_ref_code := nullif(trim(v_order.referred_by), '');
    IF v_effective_ref_code IS NULL THEN
      v_effective_ref_code := nullif(trim(v_user.referred_by), '');
    END IF;

    IF v_effective_ref_code IS NOT NULL THEN
      SELECT id, email, is_tester INTO v_referrer
      FROM public.profiles
      WHERE referral_code = v_effective_ref_code
        AND id <> v_user.id
      LIMIT 1;

      IF FOUND THEN
        IF v_referrer.is_tester = true THEN
          SELECT id INTO v_existing_ref
          FROM public.sandbox_balance_logs
          WHERE user_id = v_referrer.id
            AND type = 'Referral'
            AND description ILIKE '%#' || v_order.order_id || '%'
          LIMIT 1;

          IF NOT FOUND THEN
            v_referral_comm_awarded := 500;

            INSERT INTO public.sandbox_wallets (user_id, balance, created_at, updated_at)
            VALUES (v_referrer.id, 1000000, now(), now())
            ON CONFLICT (user_id) DO NOTHING;

            SELECT balance INTO v_ref_cur_bal
            FROM public.sandbox_wallets
            WHERE user_id = v_referrer.id
            FOR UPDATE;

            v_ref_new_bal := v_ref_cur_bal + v_referral_comm_awarded;

            UPDATE public.sandbox_wallets
            SET balance = v_ref_new_bal, updated_at = now()
            WHERE user_id = v_referrer.id;

            INSERT INTO public.sandbox_balance_logs (
              user_id, user_email, amount, type, description,
              initial_balance, final_balance, created_at
            )
            VALUES (
              v_referrer.id,
              v_referrer.email,
              v_referral_comm_awarded,
              'Referral',
              'Komisi Referral Order #' || v_order.order_id || ' (' || coalesce(v_user.email, 'Downline') || ') [Sandbox]',
              v_ref_cur_bal,
              v_ref_new_bal,
              timezone('utc'::text, now())
            );

            v_referrer_status := 'TESTER_CREDITED';
          END IF;
        ELSE
          v_referrer_status := 'NON_TESTER_LIVE_PROTECTED';
        END IF;
      END IF;
    END IF;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.order_id,
    'cashback_awarded', v_cashback_awarded,
    'welcome_bonus_awarded', v_welcome_bonus_awarded,
    'referral_commission_awarded', v_referral_comm_awarded,
    'referrer_status', v_referrer_status,
    'message', 'Eksekusi reward sandbox selesai'
  );
END;
$$;

-- Permissions for Sandbox RPCs
REVOKE ALL ON FUNCTION public.execute_sandbox_coin_payment_atomic(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_coin_payment_atomic(text) TO service_role;

REVOKE ALL ON FUNCTION public.execute_sandbox_coin_refund_atomic(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_coin_refund_atomic(text) TO service_role;

REVOKE ALL ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) TO service_role;

-- =============================================================================
-- 4. UPDATE create_pending_order_from_reservation TO ROUTE SANDBOX ORDERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_pending_order_from_reservation(
  p_reservation_id uuid,
  p_external_base_amount numeric,
  p_authenticated_user_id uuid,
  p_order_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_reservation public.code_reservations;
  v_profile_email text;
  v_unique_numeric numeric;
  v_unique_code integer;
  v_created public.orders;
  v_created_sandbox public.sandbox_orders;
  v_is_sandbox boolean;
BEGIN
  IF p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_RESERVATION_REQUIRED';
  END IF;

  IF p_external_base_amount IS NULL
     OR p_external_base_amount <= 0
     OR p_external_base_amount <> trunc(p_external_base_amount) THEN
    RAISE EXCEPTION 'ORDER_EXTERNAL_AMOUNT_INVALID';
  END IF;

  SELECT * INTO v_reservation
  FROM public.code_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_RESERVATION_NOT_FOUND';
  END IF;

  IF v_reservation.expired_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'ORDER_RESERVATION_EXPIRED';
  END IF;

  IF v_reservation.total_amount <= 0
     OR v_reservation.total_amount <> trunc(v_reservation.total_amount) THEN
    RAISE EXCEPTION 'ORDER_RESERVATION_TOTAL_INVALID';
  END IF;

  v_unique_numeric := v_reservation.total_amount - p_external_base_amount;

  IF v_unique_numeric <> trunc(v_unique_numeric)
     OR v_unique_numeric < 1
     OR v_unique_numeric > 2000 THEN
    RAISE EXCEPTION 'ORDER_RESERVATION_TOTAL_MISMATCH';
  END IF;

  v_unique_code := v_unique_numeric::integer;

  -- Check collision across both orders (LIVE) and sandbox_orders (SANDBOX)
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE status = 'Pending'
      AND total_amount = v_reservation.total_amount
  ) OR EXISTS (
    SELECT 1 FROM public.sandbox_orders
    WHERE status = 'Pending'
      AND total_amount = v_reservation.total_amount
  ) OR EXISTS (
    SELECT 1 FROM public.deposits
    WHERE status = 'Pending'
      AND total_amount::numeric = v_reservation.total_amount
  ) THEN
    RAISE EXCEPTION 'ORDER_PENDING_TOTAL_EXISTS';
  END IF;

  IF p_authenticated_user_id IS NOT NULL THEN
    SELECT email INTO v_profile_email
    FROM public.profiles
    WHERE id = p_authenticated_user_id;

    IF NOT FOUND OR nullif(btrim(v_profile_email), '') IS NULL THEN
      RAISE EXCEPTION 'ORDER_PROFILE_INVALID';
    END IF;
  END IF;

  v_is_sandbox := coalesce((p_order_data->>'is_sandbox')::boolean, false);

  IF v_is_sandbox THEN
    -- Route to public.sandbox_orders while preserving exact unique-code and reservation flow
    INSERT INTO public.sandbox_orders (
      order_id, api_ref_id, sku, product_name, item_label, customer_no,
      buy_price, price, discount, voucher_code, voucher_amount, cashback,
      payment_method, product_type, manual_product_id, sn, user_contact,
      referred_by, category, ip_address, device_id, raw_tagihan, customer_name,
      segment_power, stand_meter, "desc", status, user_id, email, used_balance,
      unique_code, total_amount, idempotency_key, created_at, updated_at
    )
    VALUES (
      p_order_data->>'order_id',
      coalesce(p_order_data->>'api_ref_id', p_order_data->>'order_id'),
      p_order_data->>'sku',
      coalesce(p_order_data->>'product_name', 'Produk Digital'),
      p_order_data->>'item_label',
      p_order_data->>'customer_no',
      coalesce((p_order_data->>'buy_price')::numeric, 0),
      (p_order_data->>'price')::numeric,
      coalesce((p_order_data->>'discount')::numeric, 0),
      p_order_data->>'voucher_code',
      coalesce((p_order_data->>'voucher_amount')::numeric, 0),
      coalesce((p_order_data->>'cashback')::numeric, 0),
      p_order_data->>'payment_method',
      coalesce(p_order_data->>'product_type', 'provider'),
      (p_order_data->>'manual_product_id')::uuid,
      p_order_data->>'sn',
      p_order_data->>'user_contact',
      p_order_data->>'referred_by',
      coalesce(p_order_data->>'category', 'umum'),
      p_order_data->>'ip_address',
      p_order_data->>'device_id',
      coalesce((p_order_data->>'raw_tagihan')::numeric, 0),
      p_order_data->>'customer_name',
      p_order_data->>'segment_power',
      p_order_data->>'stand_meter',
      p_order_data->'desc',
      'Pending',
      p_authenticated_user_id,
      v_profile_email,
      0,
      v_unique_code,
      v_reservation.total_amount,
      null,
      clock_timestamp(),
      clock_timestamp()
    )
    RETURNING * INTO v_created_sandbox;

    DELETE FROM public.code_reservations
    WHERE id = v_reservation.id;

    RETURN to_jsonb(v_created_sandbox);
  ELSE
    -- Route to public.orders (LIVE)
    v_created := public._insert_order_from_trusted_payload(
      p_order_data,
      'Pending',
      p_authenticated_user_id,
      v_profile_email,
      0,
      v_unique_code,
      v_reservation.total_amount,
      null
    );

    DELETE FROM public.code_reservations
    WHERE id = v_reservation.id;

    RETURN to_jsonb(v_created);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_order_from_reservation(uuid, numeric, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pending_order_from_reservation(uuid, numeric, uuid, jsonb) TO authenticated, anon, service_role;

