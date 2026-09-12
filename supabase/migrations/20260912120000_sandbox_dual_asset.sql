-- Migration: 20260912120000_sandbox_dual_asset.sql
-- Purpose: Phase 3C Sandbox Dual-Asset & Reward Simulation (Saldo Virtual & Koin Sandbox)
-- 1. Add coin_balance to public.sandbox_wallets
-- 2. Add asset_type, initial_coin_balance, final_coin_balance to public.sandbox_balance_logs
-- 3. Backfill historical sandbox_balance_logs with asset_type = 'balance'
-- 4. Add used_coin to public.sandbox_orders
-- 5. Add simulated_member_type to public.sandbox_access
-- 6. Update execute_sandbox_coin_payment_atomic (dual-asset debit foundation)
-- 7. Update execute_sandbox_coin_refund_atomic (dual-asset refund)
-- 8. Update execute_sandbox_success_rewards_atomic (Cashback to Koin Sandbox for Special; Referral to Saldo Virtual)
-- 9. Update create_sandbox_order_guarded (persist buy_price, cashback, used_balance, used_coin)
--
-- Security:
--   - SECURITY DEFINER with search_path = public, pg_temp
--   - service_role execution only
--   - Revoked from PUBLIC, anon, authenticated
--   - ZERO mutation on LIVE profiles, balance_logs, orders

-- =============================================================================
-- 1. SCHEMA ADDITIONS
-- =============================================================================

-- 1.1 sandbox_wallets.coin_balance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sandbox_wallets' AND column_name = 'coin_balance'
  ) THEN
    ALTER TABLE public.sandbox_wallets ADD COLUMN coin_balance bigint NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 1.2 sandbox_balance_logs dual-asset columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sandbox_balance_logs' AND column_name = 'asset_type'
  ) THEN
    ALTER TABLE public.sandbox_balance_logs ADD COLUMN asset_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sandbox_balance_logs' AND column_name = 'initial_coin_balance'
  ) THEN
    ALTER TABLE public.sandbox_balance_logs ADD COLUMN initial_coin_balance bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sandbox_balance_logs' AND column_name = 'final_coin_balance'
  ) THEN
    ALTER TABLE public.sandbox_balance_logs ADD COLUMN final_coin_balance bigint;
  END IF;
END $$;

-- Constraint: asset_type IS NULL OR asset_type IN ('balance', 'coin')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sandbox_balance_logs_asset_type'
  ) THEN
    ALTER TABLE public.sandbox_balance_logs
      ADD CONSTRAINT chk_sandbox_balance_logs_asset_type
      CHECK (asset_type IS NULL OR asset_type IN ('balance', 'coin'));
  END IF;
END $$;

-- Backfill historical sandbox_balance_logs safely: existing rows were balance mutations
UPDATE public.sandbox_balance_logs
SET asset_type = 'balance'
WHERE asset_type IS NULL;

-- 1.3 sandbox_orders.used_coin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sandbox_orders' AND column_name = 'used_coin'
  ) THEN
    ALTER TABLE public.sandbox_orders ADD COLUMN used_coin bigint NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 1.4 sandbox_access.simulated_member_type (Sandbox persona simulation, zero LIVE mutation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sandbox_access' AND column_name = 'simulated_member_type'
  ) THEN
    ALTER TABLE public.sandbox_access ADD COLUMN simulated_member_type text NOT NULL DEFAULT 'regular';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sandbox_access_simulated_member_type'
  ) THEN
    ALTER TABLE public.sandbox_access
      ADD CONSTRAINT chk_sandbox_access_simulated_member_type
      CHECK (simulated_member_type IN ('regular', 'special'));
  END IF;
END $$;

-- =============================================================================
-- 2. ATOMIC RPC: execute_sandbox_coin_payment_atomic
-- =============================================================================
CREATE OR REPLACE FUNCTION public.execute_sandbox_coin_payment_atomic(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_used_bal bigint;
  v_used_coin bigint;
  v_cur_bal bigint;
  v_cur_coin bigint;
  v_final_bal bigint;
  v_final_coin bigint;
  v_existing_log record;
BEGIN
  -- 1. Lock and fetch order from public.sandbox_orders
  SELECT id, order_id, user_id, email, used_balance, used_coin, product_name, status
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
      'error', 'INVALID_STATUS_FOR_PAYMENT',
      'current_status', v_order.status,
      'message', 'Status order tidak sah untuk pemotongan: ' || coalesce(v_order.status, 'NULL')
    );
  END IF;

  v_used_bal := coalesce(v_order.used_balance, 0);
  v_used_coin := coalesce(v_order.used_coin, 0);

  -- Mixed payment guard (deferred to future phase)
  IF v_used_bal > 0 AND v_used_coin > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MIXED_PAYMENT_NOT_SUPPORTED',
      'message', 'Pembayaran kombinasi Saldo dan Koin belum didukung'
    );
  END IF;

  IF v_used_bal <= 0 AND v_used_coin <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'debited_amount', 0,
      'already_paid', true,
      'message', 'Order tidak memerlukan pembayaran aset virtual'
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
  SELECT id, final_balance, final_coin_balance INTO v_existing_log
  FROM public.sandbox_balance_logs
  WHERE user_id = v_order.user_id
    AND type = 'Payment'
    AND description ILIKE '%#' || v_order.order_id || '%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'debited_amount', coalesce(v_used_bal, v_used_coin),
      'remaining_balance', v_existing_log.final_balance,
      'remaining_coin', v_existing_log.final_coin_balance,
      'already_paid', true,
      'message', 'Order sudah terbayar sebelumnya (Idempotent Guard)'
    );
  END IF;

  -- 3. Ensure and lock sandbox wallet
  INSERT INTO public.sandbox_wallets (user_id, balance, coin_balance, created_at, updated_at)
  VALUES (v_order.user_id, 1000000, 0, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, coin_balance INTO v_cur_bal, v_cur_coin
  FROM public.sandbox_wallets
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  -- 4. Debit logic by asset type
  IF v_used_bal > 0 THEN
    -- Full Saldo Virtual path
    IF v_cur_bal < v_used_bal THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_SANDBOX_BALANCE',
        'available_balance', v_cur_bal,
        'needed_amount', v_used_bal,
        'message', 'Saldo virtual sandbox tidak mencukupi'
      );
    END IF;

    v_final_bal := v_cur_bal - v_used_bal;

    UPDATE public.sandbox_wallets
    SET balance = v_final_bal, updated_at = now()
    WHERE user_id = v_order.user_id;

    INSERT INTO public.sandbox_balance_logs (
      user_id, user_email, amount, type, description,
      asset_type, initial_balance, final_balance,
      initial_coin_balance, final_coin_balance, created_at
    ) VALUES (
      v_order.user_id,
      v_order.email,
      -v_used_bal,
      'Payment',
      'Pembayaran Order #' || v_order.order_id || ' (' || coalesce(v_order.product_name, 'Produk Digital') || ') [Sandbox]',
      'balance',
      v_cur_bal,
      v_final_bal,
      NULL,
      NULL,
      timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'debited_amount', v_used_bal,
      'asset_type', 'balance',
      'remaining_balance', v_final_bal,
      'remaining_coin', v_cur_coin,
      'already_paid', false,
      'message', 'Payment saldo virtual sandbox berhasil'
    );
  ELSE
    -- Full Koin Sandbox Foundation path
    IF v_cur_coin < v_used_coin THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_SANDBOX_COIN',
        'available_coin', v_cur_coin,
        'needed_coin', v_used_coin,
        'message', 'Koin sandbox tidak mencukupi'
      );
    END IF;

    v_final_coin := v_cur_coin - v_used_coin;

    UPDATE public.sandbox_wallets
    SET coin_balance = v_final_coin, updated_at = now()
    WHERE user_id = v_order.user_id;

    INSERT INTO public.sandbox_balance_logs (
      user_id, user_email, amount, type, description,
      asset_type, initial_balance, final_balance,
      initial_coin_balance, final_coin_balance, created_at
    ) VALUES (
      v_order.user_id,
      v_order.email,
      -v_used_coin,
      'Payment',
      'Pembayaran Koin Order #' || v_order.order_id || ' (' || coalesce(v_order.product_name, 'Produk Digital') || ') [Sandbox]',
      'coin',
      NULL,
      NULL,
      v_cur_coin,
      v_final_coin,
      timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'debited_amount', v_used_coin,
      'asset_type', 'coin',
      'remaining_balance', v_cur_bal,
      'remaining_coin', v_final_coin,
      'already_paid', false,
      'message', 'Payment koin sandbox berhasil'
    );
  END IF;
END;
$$;

-- =============================================================================
-- 3. ATOMIC RPC: execute_sandbox_coin_refund_atomic
-- =============================================================================
CREATE OR REPLACE FUNCTION public.execute_sandbox_coin_refund_atomic(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_used_bal bigint;
  v_used_coin bigint;
  v_cur_bal bigint;
  v_cur_coin bigint;
  v_final_bal bigint;
  v_final_coin bigint;
  v_existing_log record;
  v_has_paid record;
BEGIN
  -- 1. Lock and fetch order from public.sandbox_orders
  SELECT id, order_id, user_id, email, used_balance, used_coin, status
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

  v_used_bal := coalesce(v_order.used_balance, 0);
  v_used_coin := coalesce(v_order.used_coin, 0);

  IF v_used_bal <= 0 AND v_used_coin <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', 0,
      'already_refunded', true,
      'message', 'Order tidak memotong aset virtual, tidak ada yang direfund'
    );
  END IF;

  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'USER_ID_NULL',
      'message', 'Order tidak memiliki user_id'
    );
  END IF;

  -- 2. Verify that original payment was made
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
      'message', 'Tidak ditemukan mutasi pembayaran awal untuk order ini'
    );
  END IF;

  -- 3. Idempotency check: Already refunded
  SELECT id, final_balance, final_coin_balance INTO v_existing_log
  FROM public.sandbox_balance_logs
  WHERE user_id = v_order.user_id
    AND type = 'Refund'
    AND description ILIKE '%#' || v_order.order_id || '%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', coalesce(v_used_bal, v_used_coin),
      'remaining_balance', v_existing_log.final_balance,
      'remaining_coin', v_existing_log.final_coin_balance,
      'already_refunded', true,
      'message', 'Refund sandbox sudah diproses sebelumnya (Idempotent Guard)'
    );
  END IF;

  -- 4. Lock sandbox wallet
  INSERT INTO public.sandbox_wallets (user_id, balance, coin_balance, created_at, updated_at)
  VALUES (v_order.user_id, 1000000, 0, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, coin_balance INTO v_cur_bal, v_cur_coin
  FROM public.sandbox_wallets
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  -- 5. Refund logic by asset type
  IF v_used_bal > 0 THEN
    v_final_bal := v_cur_bal + v_used_bal;

    UPDATE public.sandbox_wallets
    SET balance = v_final_bal, updated_at = now()
    WHERE user_id = v_order.user_id;

    INSERT INTO public.sandbox_balance_logs (
      user_id, user_email, amount, type, description,
      asset_type, initial_balance, final_balance,
      initial_coin_balance, final_coin_balance, created_at
    ) VALUES (
      v_order.user_id,
      v_order.email,
      v_used_bal,
      'Refund',
      'Refund Otomatis: Pesanan #' || v_order.order_id || ' Gagal [Sandbox]',
      'balance',
      v_cur_bal,
      v_final_bal,
      NULL,
      NULL,
      timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', v_used_bal,
      'asset_type', 'balance',
      'remaining_balance', v_final_bal,
      'remaining_coin', v_cur_coin,
      'already_refunded', false,
      'message', 'Refund saldo virtual sandbox berhasil diproses'
    );
  ELSE
    -- Refund Koin Sandbox
    v_final_coin := v_cur_coin + v_used_coin;

    UPDATE public.sandbox_wallets
    SET coin_balance = v_final_coin, updated_at = now()
    WHERE user_id = v_order.user_id;

    INSERT INTO public.sandbox_balance_logs (
      user_id, user_email, amount, type, description,
      asset_type, initial_balance, final_balance,
      initial_coin_balance, final_coin_balance, created_at
    ) VALUES (
      v_order.user_id,
      v_order.email,
      v_used_coin,
      'Refund',
      'Refund Otomatis Koin: Pesanan #' || v_order.order_id || ' Gagal [Sandbox]',
      'coin',
      NULL,
      NULL,
      v_cur_coin,
      v_final_coin,
      timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', v_used_coin,
      'asset_type', 'coin',
      'remaining_balance', v_cur_bal,
      'remaining_coin', v_final_coin,
      'already_refunded', false,
      'message', 'Refund koin sandbox berhasil diproses'
    );
  END IF;
END;
$$;

-- =============================================================================
-- 4. ATOMIC RPC: execute_sandbox_success_rewards_atomic
-- =============================================================================
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
  v_settings record;
  v_sim_member_type text := 'regular';
  v_cashback_awarded bigint := 0;
  v_welcome_bonus_awarded bigint := 0;
  v_referral_comm_awarded bigint := 0;
  v_referrer_status text := 'NO_REFERRER';
  v_cur_bal bigint;
  v_new_bal bigint;
  v_cur_coin bigint;
  v_new_coin bigint;
  v_ref_cur_bal bigint;
  v_ref_new_bal bigint;
  v_order_count integer;
  v_existing_cashback record;
  v_existing_welcome record;
  v_existing_ref record;
  v_profit_murni numeric;
  v_rate numeric;
BEGIN
  -- 1. Lock and fetch order from public.sandbox_orders
  SELECT id, order_id, user_id, email, used_balance, used_coin, buy_price, price,
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

  -- Fetch user profile (for email, referral relationships)
  SELECT id, email, referred_by
  INTO v_user
  FROM public.profiles
  WHERE id = v_order.user_id;

  -- Fetch effective simulated member type from public.sandbox_access (strictly isolated)
  SELECT coalesce(simulated_member_type, 'regular')
  INTO v_sim_member_type
  FROM public.sandbox_access
  WHERE user_id = v_order.user_id;

  -- Fetch store referral settings
  SELECT first_referral_percent, next_referral_percent, welcome_bonus_amount, welcome_bonus_min_trx
  INTO v_settings
  FROM public.store_settings
  LIMIT 1;

  -- Ensure user has sandbox wallet and lock row
  INSERT INTO public.sandbox_wallets (user_id, balance, coin_balance, created_at, updated_at)
  VALUES (v_user.id, 1000000, 0, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, coin_balance INTO v_cur_bal, v_cur_coin
  FROM public.sandbox_wallets
  WHERE user_id = v_user.id
  FOR UPDATE;

  -- ===========================================================================
  -- A. CASHBACK EVALUATION: EXCLUSIVE TO SPECIAL SIMULATION
  -- ===========================================================================
  IF lower(coalesce(v_sim_member_type, 'regular')) = 'special' AND coalesce(v_order.cashback, 0) > 0 THEN
    SELECT id INTO v_existing_cashback
    FROM public.sandbox_balance_logs
    WHERE user_id = v_user.id
      AND type = 'Cashback'
      AND description ILIKE '%#' || v_order.order_id || '%'
    LIMIT 1;

    IF NOT FOUND THEN
      v_cashback_awarded := v_order.cashback::bigint;
      v_new_coin := v_cur_coin + v_cashback_awarded;

      UPDATE public.sandbox_wallets
      SET coin_balance = v_new_coin, updated_at = now()
      WHERE user_id = v_user.id;

      INSERT INTO public.sandbox_balance_logs (
        user_id, user_email, amount, type, description,
        asset_type, initial_balance, final_balance,
        initial_coin_balance, final_coin_balance, created_at
      ) VALUES (
        v_user.id,
        v_user.email,
        v_cashback_awarded,
        'Cashback',
        'Cashback Simulasi Member Spesial Order #' || v_order.order_id || ' [Sandbox]',
        'coin',
        NULL,
        NULL,
        v_cur_coin,
        v_new_coin,
        timezone('utc'::text, now())
      );

      v_cur_coin := v_new_coin;
    END IF;
  END IF;

  -- ===========================================================================
  -- B. WELCOME BONUS EVALUATION (FIRST BERHASIL TRANSACTION - BOTH REGULAR & SPECIAL)
  -- ===========================================================================
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
      v_welcome_bonus_awarded := coalesce(v_settings.welcome_bonus_amount, 2500)::bigint;
      v_new_bal := v_cur_bal + v_welcome_bonus_awarded;

      UPDATE public.sandbox_wallets
      SET balance = v_new_bal, updated_at = now()
      WHERE user_id = v_user.id;

      INSERT INTO public.sandbox_balance_logs (
        user_id, user_email, amount, type, description,
        asset_type, initial_balance, final_balance,
        initial_coin_balance, final_coin_balance, created_at
      ) VALUES (
        v_user.id,
        v_user.email,
        v_welcome_bonus_awarded,
        'Bonus',
        'Bonus Transaksi Pertama [Sandbox]',
        'balance',
        v_cur_bal,
        v_new_bal,
        NULL,
        NULL,
        timezone('utc'::text, now())
      );

      v_cur_bal := v_new_bal;
    END IF;
  END IF;

  -- ===========================================================================
  -- C. REFERRAL COMMISSION EVALUATION (BOTH REGULAR & SPECIAL)
  -- ===========================================================================
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
            -- Calculate pure profit from Sandbox economics: (Price - BuyPrice)
            v_profit_murni := (coalesce(v_order.used_balance, 0) + coalesce(v_order.used_coin, 0)) - coalesce(v_order.buy_price, 0);

            IF v_profit_murni > 0 THEN
              v_rate := CASE
                WHEN v_order_count = 1 THEN coalesce(v_settings.first_referral_percent, 7)
                ELSE coalesce(v_settings.next_referral_percent, 5)
              END;
              v_referral_comm_awarded := greatest(100, floor(v_profit_murni * (v_rate / 100.0)))::bigint;
            ELSE
              v_referral_comm_awarded := 100;
            END IF;

            INSERT INTO public.sandbox_wallets (user_id, balance, coin_balance, created_at, updated_at)
            VALUES (v_referrer.id, 1000000, 0, now(), now())
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
              asset_type, initial_balance, final_balance,
              initial_coin_balance, final_coin_balance, created_at
            ) VALUES (
              v_referrer.id,
              v_referrer.email,
              v_referral_comm_awarded,
              'Referral',
              'Komisi Referral Order #' || v_order.order_id || ' (' || coalesce(v_user.email, 'Downline') || ') [Sandbox]',
              'balance',
              v_ref_cur_bal,
              v_ref_new_bal,
              NULL,
              NULL,
              timezone('utc'::text, now())
            );

            UPDATE public.sandbox_orders
            SET referral_commission = v_referral_comm_awarded
            WHERE id = v_order.id;

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
    'simulated_member_type', v_sim_member_type,
    'cashback_awarded', v_cashback_awarded,
    'welcome_bonus_awarded', v_welcome_bonus_awarded,
    'referral_commission_awarded', v_referral_comm_awarded,
    'referrer_status', v_referrer_status,
    'message', 'Eksekusi reward sandbox dual-asset selesai'
  );
END;
$$;

-- =============================================================================
-- 5. ATOMIC RPC: create_sandbox_order_guarded
-- =============================================================================
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
  v_buy_price numeric;
  v_cashback numeric;
  v_used_balance bigint;
  v_used_coin bigint;
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
  v_buy_price := coalesce((p_order_data->>'buy_price')::numeric, v_price);
  v_cashback := coalesce((p_order_data->>'cashback')::numeric, 0);
  v_used_balance := coalesce((p_order_data->>'used_balance')::bigint, v_price::bigint);
  v_used_coin := coalesce((p_order_data->>'used_coin')::bigint, 0);

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
    used_coin,
    buy_price,
    cashback,
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
    v_used_balance,
    v_used_coin,
    v_buy_price,
    v_cashback,
    CASE WHEN v_used_coin > 0 THEN 'KOIN_SANDBOX' ELSE 'SALDO_VIRTUAL' END,
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

-- =============================================================================
-- 6. RPC PERMISSIONS
-- =============================================================================
REVOKE ALL ON FUNCTION public.execute_sandbox_coin_payment_atomic(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_coin_payment_atomic(text) TO service_role;

REVOKE ALL ON FUNCTION public.execute_sandbox_coin_refund_atomic(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_coin_refund_atomic(text) TO service_role;

REVOKE ALL ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) TO service_role;

REVOKE ALL ON FUNCTION public.create_sandbox_order_guarded(uuid, jsonb, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sandbox_order_guarded(uuid, jsonb, integer, integer) TO service_role;
