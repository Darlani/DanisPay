-- Migration: 20260904100000_refund_failed_order_atomic.sql
-- Description: P.4E-2C Implement atomic failure refund primitive for orders failing in Diproses

create or replace function public.refund_failed_order_atomic(
  p_order_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_order public.orders;
  v_profile public.profiles;
  v_refund_amount bigint;
  v_initial_balance bigint;
  v_final_balance bigint;
  v_clean_reason text;
begin
  if p_order_id is null then
    return false;
  end if;

  v_clean_reason := nullif(btrim(p_reason), '');

  -- 1. Pessimistic row lock on the target order
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  -- 2. Idempotency guard: only orders actively in 'Diproses' are eligible
  if not found or v_order.status is distinct from 'Diproses' then
    return false;
  end if;

  -- 3. Calculate total customer principal (coins + external cash)
  v_refund_amount := coalesce(v_order.used_balance, 0)::bigint + coalesce(v_order.total_amount, 0)::bigint;

  -- 4. Case A: Registered Member with positive refundable amount
  if v_order.user_id is not null and v_refund_amount > 0 then
    -- Lock profile second (lock order: orders -> profiles)
    select * into v_profile
    from public.profiles
    where id = v_order.user_id
    for update;

    if not found then
      raise exception 'ORDER_REFUND_PROFILE_NOT_FOUND';
    end if;

    if v_profile.balance is null or nullif(btrim(v_profile.email), '') is null then
      raise exception 'ORDER_REFUND_PROFILE_INVALID';
    end if;

    v_initial_balance := v_profile.balance;

    -- Arithmetic overflow protection
    if v_initial_balance > 9223372036854775807::bigint - v_refund_amount then
      raise exception 'ORDER_REFUND_BALANCE_OVERFLOW';
    end if;

    v_final_balance := v_initial_balance + v_refund_amount;

    -- Credit wallet
    update public.profiles
    set balance = v_final_balance
    where id = v_profile.id;

    -- Audit trail in balance_logs
    insert into public.balance_logs (
      user_id,
      user_email,
      amount,
      type,
      description,
      initial_balance,
      final_balance,
      upgrade_fee,
      created_at
    )
    values (
      v_profile.id,
      v_profile.email,
      v_refund_amount,
      'Refund',
      format('Refund Gagal Order #%s', v_order.order_id),
      v_initial_balance,
      v_final_balance,
      0,
      clock_timestamp()
    );

    -- Mark order Gagal
    update public.orders
    set
      status = 'Gagal',
      updated_at = clock_timestamp(),
      notes = coalesce(
        v_clean_reason,
        format('Otomatis Refund Balance: Rp %s (Semua Suplier Gagal)', v_refund_amount)
      )
    where id = v_order.id;

  -- 5. Case B: Guest Order or zero balance to credit
  else
    update public.orders
    set
      status = 'Gagal',
      updated_at = clock_timestamp(),
      notes = case
        when v_order.user_id is null and v_refund_amount > 0 then
          coalesce(
            v_clean_reason,
            format('Gagal - WAJIB REFUND MANUAL: Rp %s (GUEST / Suplier Habis)', v_refund_amount)
          )
        else
          coalesce(v_clean_reason, 'Gagal di vendor (Semua Suplier Gagal)')
      end
    where id = v_order.id;
  end if;

  return true;
end;
$$;

revoke all on function public.refund_failed_order_atomic(uuid, text)
  from public, anon, authenticated;

grant execute on function public.refund_failed_order_atomic(uuid, text)
  to service_role;

