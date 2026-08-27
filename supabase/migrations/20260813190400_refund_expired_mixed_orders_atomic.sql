create or replace function public.refund_expired_mixed_order_atomic(
  p_order_id uuid
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
begin
  if p_order_id is null then
    raise exception 'ORDER_REFUND_INVALID_ORDER';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found
     or v_order.status is distinct from 'Pending'
     or v_order.used_balance is null
     or v_order.used_balance <= 0
     or v_order.total_amount is null
     or v_order.total_amount <= 0
     or v_order.created_at is null
     or v_order.created_at >= clock_timestamp() - interval '2 hours' then
    return false;
  end if;

  if v_order.user_id is null then
    raise exception 'ORDER_REFUND_INVALID_ORDER';
  end if;

  v_refund_amount := v_order.used_balance;

  select * into v_profile
  from public.profiles
  where id = v_order.user_id
  for update;

  if not found then
    raise exception 'ORDER_REFUND_PROFILE_NOT_FOUND';
  end if;

  if v_profile.balance is null
     or nullif(btrim(v_profile.email), '') is null then
    raise exception 'ORDER_REFUND_PROFILE_INVALID';
  end if;

  v_initial_balance := v_profile.balance;

  if v_initial_balance > 9223372036854775807::bigint - v_refund_amount then
    raise exception 'ORDER_REFUND_BALANCE_OVERFLOW';
  end if;

  v_final_balance := v_initial_balance + v_refund_amount;

  update public.profiles
  set balance = v_final_balance
  where id = v_profile.id;

  insert into public.balance_logs (
    user_id,
    user_email,
    amount,
    type,
    description,
    initial_balance,
    final_balance
  )
  values (
    v_profile.id,
    v_profile.email,
    v_refund_amount,
    'Refund',
    format('Refund Koin (Order Batal Expired) #%s', v_order.order_id),
    v_initial_balance,
    v_final_balance
  );

  update public.orders
  set
    status = 'Gagal',
    updated_at = clock_timestamp(),
    notes = format(
      'Batal Otomatis: Batas waktu pembayaran habis. Koin Rp %s telah dikembalikan.',
      v_refund_amount
    )
  where id = v_order.id;

  return true;
end;
$$;


revoke all on function public.refund_expired_mixed_order_atomic(uuid)
  from public, anon, authenticated;

grant execute on function public.refund_expired_mixed_order_atomic(uuid)
  to service_role;
