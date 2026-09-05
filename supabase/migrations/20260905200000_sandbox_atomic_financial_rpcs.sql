-- Migration: 20260905200000_sandbox_atomic_financial_rpcs.sql
-- Description: Isolated, Atomic, Transactional PL/pgSQL RPCs for Sandbox Financial Subsystem
-- Functions:
--   1. public.execute_sandbox_coin_payment_atomic(text)
--   2. public.execute_sandbox_coin_refund_atomic(text)
--   3. public.execute_sandbox_success_rewards_atomic(text)
--
-- Security & Access:
--   - SECURITY DEFINER with search_path = public, pg_temp
--   - Restricted strictly to service_role (Admin Backend Only)
--   - Revoked from public, anon, authenticated

-- =============================================================================
-- 1. EXECUTE SANDBOX COIN PAYMENT ATOMIC
-- =============================================================================
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
  -- 1. Lock and fetch order
  SELECT id, order_id, user_id, email, used_balance, product_name, is_sandbox, status, notes
  INTO v_order
  FROM public.orders
  WHERE (id::text = p_order_id OR order_id = p_order_id)
    AND is_sandbox = true
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
    user_id, user_email, amount, type, description, initial_balance, final_balance, created_at
  ) VALUES (
    v_order.user_id,
    v_order.email,
    -v_coin_needed,
    'Payment',
    'Pembayaran Koin Sandbox #' || v_order.order_id || ' (' || coalesce(v_order.product_name, 'Produk') || ')',
    v_cur_bal,
    v_final_bal,
    now()
  );

  -- 5. Mark notes tag
  UPDATE public.orders
  SET notes = CASE
    WHEN notes IS NULL OR notes = '' THEN '[SB_COIN_DEBITED]'
    WHEN notes NOT ILIKE '%[SB_COIN_DEBITED]%' THEN notes || ' [SB_COIN_DEBITED]'
    ELSE notes
  END,
  updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.order_id,
    'debited_amount', v_coin_needed,
    'remaining_balance', v_final_bal,
    'already_paid', false,
    'message', 'Sukses mendebit koin sandbox secara atomik'
  );
END;
$$;

-- =============================================================================
-- 2. EXECUTE SANDBOX COIN REFUND ATOMIC
-- =============================================================================
CREATE OR REPLACE FUNCTION public.execute_sandbox_coin_refund_atomic(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_refund_amount bigint;
  v_cur_bal bigint;
  v_final_bal bigint;
  v_existing_refund record;
  v_existing_payment record;
BEGIN
  -- 1. Lock and fetch order
  SELECT id, order_id, user_id, email, used_balance, is_sandbox, status, notes
  INTO v_order
  FROM public.orders
  WHERE (id::text = p_order_id OR order_id = p_order_id)
    AND is_sandbox = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ORDER_NOT_FOUND',
      'message', 'Sandbox order tidak ditemukan'
    );
  END IF;

  -- Status invariant check: Refund is ONLY valid for orders with status 'Gagal'
  IF v_order.status != 'Gagal' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS_FOR_REFUND',
      'current_status', v_order.status,
      'message', 'Refund koin sandbox hanya dapat diproses untuk pesanan berstatus Gagal'
    );
  END IF;

  v_refund_amount := coalesce(v_order.used_balance, 0);

  IF v_refund_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', 0,
      'already_refunded', true,
      'message', 'Order tidak menggunakan koin sandbox'
    );
  END IF;

  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'USER_ID_NULL',
      'message', 'Order tidak memiliki user_id'
    );
  END IF;

  -- 2. Idempotency check: Already refunded
  SELECT id INTO v_existing_refund
  FROM public.sandbox_balance_logs
  WHERE user_id = v_order.user_id
    AND type = 'Refund'
    AND description ILIKE '%#' || v_order.order_id || '%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', v_refund_amount,
      'already_refunded', true,
      'message', 'Order sudah pernah di-refund sebelumnya'
    );
  END IF;

  -- 3. Verify payment log exists
  SELECT id INTO v_existing_payment
  FROM public.sandbox_balance_logs
  WHERE user_id = v_order.user_id
    AND type = 'Payment'
    AND description ILIKE '%#' || v_order.order_id || '%'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'refunded_amount', 0,
      'message', 'Tidak ditemukan riwayat pemotongan koin untuk order ini'
    );
  END IF;

  -- 4. Lock and update wallet
  INSERT INTO public.sandbox_wallets (user_id, balance, created_at, updated_at)
  VALUES (v_order.user_id, 1000000, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_cur_bal
  FROM public.sandbox_wallets
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  v_final_bal := v_cur_bal + v_refund_amount;

  UPDATE public.sandbox_wallets
  SET balance = v_final_bal, updated_at = now()
  WHERE user_id = v_order.user_id;

  -- 5. Insert refund log
  INSERT INTO public.sandbox_balance_logs (
    user_id, user_email, amount, type, description, initial_balance, final_balance, created_at
  ) VALUES (
    v_order.user_id,
    v_order.email,
    v_refund_amount,
    'Refund',
    'Pengembalian Koin Sandbox (Admin Gagal #' || v_order.order_id || ')',
    v_cur_bal,
    v_final_bal,
    now()
  );

  -- 6. Mark notes
  UPDATE public.orders
  SET notes = CASE
    WHEN notes IS NULL OR notes = '' THEN '[SB_REFUND_PROCESSED]'
    WHEN notes NOT ILIKE '%[SB_REFUND_PROCESSED]%' THEN notes || ' [SB_REFUND_PROCESSED]'
    ELSE notes
  END,
  updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.order_id,
    'refunded_amount', v_refund_amount,
    'remaining_balance', v_final_bal,
    'already_refunded', false,
    'message', 'Sukses mengembalikan koin sandbox secara atomik'
  );
END;
$$;

-- =============================================================================
-- 3. EXECUTE SANDBOX SUCCESS REWARDS ATOMIC
-- =============================================================================
CREATE OR REPLACE FUNCTION public.execute_sandbox_success_rewards_atomic(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_buyer record;
  v_prod_cashback bigint := 0;
  v_cashback_awarded bigint := 0;
  v_welcome_bonus_awarded bigint := 0;
  v_referral_commission_awarded bigint := 0;
  v_referrer_status text := 'NO_REFERRER';
  v_existing_cb record;
  v_existing_bonus record;
  v_existing_ref record;
  v_sandbox_trx_count bigint := 0;
  v_is_first_trx boolean := false;
  v_settings record;
  v_referrer record;
  v_ref_code text;
  v_real_revenue bigint := 0;
  v_profit_murni bigint := 0;
  v_modal_real bigint := 0;
  v_rate numeric := 0;
  v_commission bigint := 0;
  v_cur_bal bigint;
  v_new_bal bigint;
  v_cur_ref_bal bigint;
  v_new_ref_bal bigint;
BEGIN
  -- 1. Lock and fetch order
  SELECT id, order_id, user_id, email, product_name, item_label,
         total_amount, unique_code, used_balance, raw_tagihan, buy_price,
         cashback, category, referred_by, is_sandbox, status, notes
  INTO v_order
  FROM public.orders
  WHERE (id::text = p_order_id OR order_id = p_order_id)
    AND is_sandbox = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ORDER_NOT_FOUND',
      'message', 'Sandbox order tidak ditemukan'
    );
  END IF;

  -- Status invariant check: Rewards are ONLY valid for orders with status 'Berhasil'
  IF v_order.status != 'Berhasil' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS_FOR_REWARDS',
      'current_status', v_order.status,
      'message', 'Rewards sandbox hanya dapat diproses untuk pesanan berstatus Berhasil'
    );
  END IF;

  -- CAS check on notes
  IF v_order.notes ILIKE '%[SB_REWARDS_PROCESSED]%' THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'cashback_awarded', 0,
      'welcome_bonus_awarded', 0,
      'referral_commission_awarded', 0,
      'already_processed', true,
      'message', 'Rewards sandbox sudah pernah diproses sebelumnya (CAS Lock Guard)'
    );
  END IF;

  -- Mark CAS lock in orders.notes
  UPDATE public.orders
  SET notes = CASE
    WHEN notes IS NULL OR notes = '' THEN '[SB_REWARDS_PROCESSED]'
    ELSE notes || ' [SB_REWARDS_PROCESSED]'
  END,
  updated_at = now()
  WHERE id = v_order.id;

  IF v_order.user_id IS NULL OR v_order.email IS NULL OR v_order.email = 'null' THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.order_id,
      'cashback_awarded', 0,
      'welcome_bonus_awarded', 0,
      'referral_commission_awarded', 0,
      'message', 'Guest order tidak eligible untuk reward sandbox'
    );
  END IF;

  -- 2. Buyer profile check with row lock (Serializes first-transaction evaluation per user)
  SELECT id, member_type, referred_by
  INTO v_buyer
  FROM public.profiles
  WHERE id = v_order.user_id
  FOR UPDATE;

  -- ===========================================================================
  -- A. CASHBACK SPECIAL
  -- ===========================================================================
  IF lower(coalesce(v_buyer.member_type, '')) = 'special' THEN
    SELECT coalesce(cashback, 0) INTO v_prod_cashback
    FROM public.products
    WHERE name = v_order.product_name
    LIMIT 1;

    IF v_prod_cashback > 0 THEN
      SELECT id INTO v_existing_cb
      FROM public.sandbox_balance_logs
      WHERE user_id = v_order.user_id
        AND type = 'Cashback'
        AND description ILIKE '%#' || v_order.order_id || '%'
      LIMIT 1;

      IF NOT FOUND THEN
        INSERT INTO public.sandbox_wallets (user_id, balance, created_at, updated_at)
        VALUES (v_order.user_id, 1000000, now(), now())
        ON CONFLICT (user_id) DO NOTHING;

        SELECT balance INTO v_cur_bal
        FROM public.sandbox_wallets
        WHERE user_id = v_order.user_id
        FOR UPDATE;

        v_new_bal := v_cur_bal + v_prod_cashback;

        UPDATE public.sandbox_wallets
        SET balance = v_new_bal, updated_at = now()
        WHERE user_id = v_order.user_id;

        INSERT INTO public.sandbox_balance_logs (
          user_id, user_email, amount, type, description, initial_balance, final_balance, created_at
        ) VALUES (
          v_order.user_id,
          v_order.email,
          v_prod_cashback,
          'Cashback',
          'Cashback Special Sandbox #' || v_order.order_id,
          v_cur_bal,
          v_new_bal,
          now()
        );

        v_cashback_awarded := v_prod_cashback;
      END IF;
    END IF;
  END IF;

  -- ===========================================================================
  -- B. FIRST TRANSACTION CHECK (SANDBOX ISOLATED)
  -- ===========================================================================
  SELECT count(*) INTO v_sandbox_trx_count
  FROM public.orders
  WHERE user_id = v_order.user_id
    AND is_sandbox = true
    AND status IN ('Berhasil', 'Diproses')
    AND id != v_order.id;

  v_is_first_trx := (v_sandbox_trx_count = 0);

  -- ===========================================================================
  -- C. WELCOME BONUS & REFERRAL COMMISSION
  -- ===========================================================================
  v_ref_code := coalesce(v_buyer.referred_by, v_order.referred_by);

  IF v_ref_code IS NOT NULL AND v_ref_code != '' THEN
    SELECT first_referral_percent, next_referral_percent, welcome_bonus_amount, welcome_bonus_min_trx
    INTO v_settings
    FROM public.store_settings
    LIMIT 1;

    SELECT id, email, is_tester, balance
    INTO v_referrer
    FROM public.profiles
    WHERE referral_code = v_ref_code
    LIMIT 1;

    IF FOUND THEN
      v_real_revenue := coalesce(v_order.total_amount, 0) - coalesce(v_order.unique_code, 0) + coalesce(v_order.used_balance, 0);

      -- 1. Welcome Bonus
      IF v_is_first_trx AND coalesce(v_settings.welcome_bonus_amount, 0) > 0 THEN
        IF v_real_revenue >= coalesce(v_settings.welcome_bonus_min_trx, 50000) THEN
          SELECT id INTO v_existing_bonus
          FROM public.sandbox_balance_logs
          WHERE user_id = v_order.user_id
            AND type = 'Bonus'
            AND description ILIKE '%#' || v_order.order_id || '%'
          LIMIT 1;

          IF NOT FOUND THEN
            SELECT balance INTO v_cur_bal
            FROM public.sandbox_wallets
            WHERE user_id = v_order.user_id
            FOR UPDATE;

            v_new_bal := v_cur_bal + v_settings.welcome_bonus_amount;

            UPDATE public.sandbox_wallets
            SET balance = v_new_bal, updated_at = now()
            WHERE user_id = v_order.user_id;

            INSERT INTO public.sandbox_balance_logs (
              user_id, user_email, amount, type, description, initial_balance, final_balance, created_at
            ) VALUES (
              v_order.user_id,
              v_order.email,
              v_settings.welcome_bonus_amount,
              'Bonus',
              'Bonus Welcome Sandbox (Trx Pertama >= Rp' || to_char(coalesce(v_settings.welcome_bonus_min_trx, 50000), 'FM999,999,999') || ') #' || v_order.order_id,
              v_cur_bal,
              v_new_bal,
              now()
            );

            v_welcome_bonus_awarded := v_settings.welcome_bonus_amount;
          END IF;
        END IF;
      END IF;

      -- 2. Referral Commission
      IF lower(coalesce(v_order.category, '')) LIKE '%pascabayar%' OR lower(coalesce(v_order.category, '')) LIKE '%pln%' THEN
        v_modal_real := coalesce(v_order.raw_tagihan, 0) + coalesce(v_order.buy_price, 0);
        v_profit_murni := v_real_revenue - v_modal_real - coalesce(v_order.cashback, 0);
      ELSE
        v_profit_murni := v_real_revenue - coalesce(v_order.buy_price, 0) - coalesce(v_order.cashback, 0);
      END IF;

      IF v_profit_murni > 0 THEN
        v_rate := CASE
          WHEN v_is_first_trx THEN coalesce(v_settings.first_referral_percent, 0)
          ELSE coalesce(v_settings.next_referral_percent, 0)
        END;

        v_commission := floor(v_profit_murni * (v_rate / 100.0));

        IF v_commission > 0 THEN
          UPDATE public.orders
          SET referral_commission = v_commission
          WHERE id = v_order.id;

          v_referral_commission_awarded := v_commission;

          -- STRICT NON-TESTER RULE:
          IF v_referrer.is_tester = true THEN
            v_referrer_status := 'TESTER_CREDITED';

            INSERT INTO public.sandbox_wallets (user_id, balance, created_at, updated_at)
            VALUES (v_referrer.id, 1000000, now(), now())
            ON CONFLICT (user_id) DO NOTHING;

            SELECT balance INTO v_cur_ref_bal
            FROM public.sandbox_wallets
            WHERE user_id = v_referrer.id
            FOR UPDATE;

            v_new_ref_bal := v_cur_ref_bal + v_commission;

            UPDATE public.sandbox_wallets
            SET balance = v_new_ref_bal, updated_at = now()
            WHERE user_id = v_referrer.id;

            INSERT INTO public.sandbox_balance_logs (
              user_id, user_email, amount, type, description, initial_balance, final_balance, created_at
            ) VALUES (
              v_referrer.id,
              v_referrer.email,
              v_commission,
              'Referral',
              'Komisi Referral Sandbox ' || v_rate::text || '% (Acc #' || v_order.order_id || ')',
              v_cur_ref_bal,
              v_new_ref_bal,
              now()
            );
          ELSE
            -- NON-TESTER UPLINE: NEVER MUTATE PROFILES.BALANCE OR BALANCE_LOGS!
            v_referrer_status := 'NON_TESTER_LIVE_PROTECTED';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.order_id,
    'cashback_awarded', v_cashback_awarded,
    'welcome_bonus_awarded', v_welcome_bonus_awarded,
    'referral_commission_awarded', v_referral_commission_awarded,
    'referrer_status', v_referrer_status,
    'already_processed', false,
    'message', 'Rewards sandbox sukses diproses secara atomik'
  );
END;
$$;

-- =============================================================================
-- 4. PERMISSIONS & SERVICE-ROLE ISOLATION
-- =============================================================================
REVOKE ALL ON FUNCTION public.execute_sandbox_coin_payment_atomic(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_sandbox_coin_refund_atomic(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.execute_sandbox_coin_payment_atomic(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_coin_refund_atomic(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) TO service_role;

