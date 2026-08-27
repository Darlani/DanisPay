create function public.approve_deposit_from_machine_atomic(
  p_deposit_id uuid,
  p_received_total_amount bigint,
  p_source text
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_deposit public.deposits%rowtype;
  v_profile public.profiles%rowtype;
  v_final_balance bigint;
begin
  if p_deposit_id is null
     or p_received_total_amount is null
     or p_received_total_amount <= 0
     or p_source is distinct from 'macrodroid' then
    raise exception using errcode = 'P0001', message = 'MACHINE_DEPOSIT_INVALID_INPUT';
  end if;

  select * into v_deposit
    from public.deposits as d
   where d.id = p_deposit_id
   for update;

  if not found or v_deposit.status is distinct from 'Pending' then
    return false;
  end if;

  if v_deposit.payment_channel is null
     or btrim(v_deposit.payment_channel) = ''
     or v_deposit.payment_channel not in ('qris', 'dana', 'gopay', 'ovo') then
    raise exception using errcode = 'P0001', message = 'MACHINE_DEPOSIT_CHANNEL_NOT_ALLOWED';
  end if;

  if v_deposit.total_amount is null
     or v_deposit.total_amount <> p_received_total_amount
     or v_deposit.amount is null
     or v_deposit.amount <= 0
     or v_deposit.user_email is null then
    raise exception using errcode = 'P0001', message = 'MACHINE_DEPOSIT_INVALID_DATA';
  end if;

  select * into v_profile
    from public.profiles as p
   where p.email = v_deposit.user_email
   for update;

  if not found or v_profile.balance is null or v_profile.email is null then
    raise exception using errcode = 'P0001', message = 'MACHINE_DEPOSIT_PROFILE_INVALID';
  end if;

  if v_profile.balance > 9223372036854775807::bigint - v_deposit.amount then
    raise exception using errcode = 'P0001', message = 'MACHINE_DEPOSIT_BALANCE_OVERFLOW';
  end if;

  v_final_balance := v_profile.balance + v_deposit.amount;

  update public.deposits
     set status = 'Success'
   where id = v_deposit.id;

  update public.profiles
     set balance = v_final_balance
   where id = v_profile.id;

  insert into public.balance_logs (
    user_id, user_email, amount, type, description, initial_balance, final_balance
  ) values (
    v_profile.id,
    v_profile.email,
    v_deposit.amount,
    'Deposit',
    format('Deposit Sukses (ID: %s) [source=macrodroid]', left(v_deposit.id::text, 8)),
    v_profile.balance,
    v_final_balance
  );

  -- admin_email is nullable and semantically human-oriented. Keep it NULL;
  -- source is recorded explicitly instead of fabricating a human identity.
  insert into public.admin_logs (admin_email, action, target, details)
  values (
    null,
    'MACHINE_DEPOSIT_APPROVAL',
    v_deposit.id::text,
    format('source=%s; received_total_amount=%s; credited_amount=%s', p_source, p_received_total_amount, v_deposit.amount)
  );

  return true;
end;
$$;

revoke execute on function public.approve_deposit_from_machine_atomic(uuid, bigint, text)
  from public, anon, authenticated;
grant execute on function public.approve_deposit_from_machine_atomic(uuid, bigint, text)
  to service_role;
