-- Migration: 20260906130000_fix_sandbox_referral_empty_string_fallback.sql
-- Description: Fix referral code fallback resolution in execute_sandbox_success_rewards_atomic
--
-- Rationale:
-- In existing DaPay registration flow, accounts registered without a referral code
-- have profiles.referred_by set to empty string '' rather than NULL.
-- In PostgreSQL, coalesce('', v_order.referred_by) returns '' because '' IS NOT NULL.
-- This prevented orders with referred_by from falling back to v_order.referred_by.
-- Using nullif(v_buyer.referred_by, '') correctly converts '' to NULL, allowing
-- seamless fallback to v_order.referred_by while preserving existing uplines.
--
-- Security:
--   - SECURITY DEFINER with search_path = public, pg_temp
--   - Restricted strictly to service_role

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
  -- FIX: Use nullif to gracefully convert empty string '' from profiles to NULL
  -- allowing seamless fallback to v_order.referred_by
  v_ref_code := coalesce(nullif(v_buyer.referred_by, ''), v_order.referred_by);

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

REVOKE ALL ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sandbox_success_rewards_atomic(text) TO service_role;

