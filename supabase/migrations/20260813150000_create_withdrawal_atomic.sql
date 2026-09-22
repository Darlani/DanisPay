-- Secure withdrawal-creation RPC.
-- This migration is local only until explicitly reviewed and deployed.

create function public.create_withdrawal_atomic(
  p_user_id uuid,
  p_amount bigint,
  p_bank_name text,
  p_account_number text,
  p_account_name text,
  p_admin_fee bigint
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_bank_name text;
  v_account_number text;
  v_account_name text;
  v_held_amount bigint;
  v_new_balance public.profiles.balance%type;
  v_withdrawal_id public.withdrawals.id%type;
begin
  if p_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_USER';
  end if;

  if p_amount is null or p_amount <= 0
     or p_admin_fee is null or p_admin_fee < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_INPUT';
  end if;

  v_bank_name := btrim(p_bank_name);
  v_account_number := btrim(p_account_number);
  v_account_name := btrim(p_account_name);

  if v_bank_name is null or v_bank_name = ''
     or v_account_number is null or v_account_number = ''
     or v_account_name is null or v_account_name = '' then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_INPUT';
  end if;

  if p_amount > 9223372036854775807::bigint - p_admin_fee then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_AMOUNT_OVERFLOW';
  end if;

  v_held_amount := p_amount + p_admin_fee;

  -- This is the wallet serialization point. Do not lock withdrawals here:
  -- approve/reject v4 lock withdrawal before profile, while create locks only profile.
  select *
    into v_profile
    from public.profiles as p
   where p.id = p_user_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_PROFILE_NOT_FOUND';
  end if;

  if v_profile.email is null or v_profile.balance is null then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_PROFILE_INVALID';
  end if;

  if v_profile.balance < v_held_amount then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INSUFFICIENT_BALANCE';
  end if;

  -- This deliberately remains an ordinary MVCC read. Locking an existing
  -- withdrawal after the profile lock would invert approve/reject v4's order.
  if exists (
    select 1
      from public.withdrawals as w
     where w.user_email = v_profile.email
       and w.status = 'Pending'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_PENDING_EXISTS';
  end if;

  v_new_balance := v_profile.balance - v_held_amount;

  update public.profiles
     set balance = v_new_balance
   where id = v_profile.id;

  insert into public.withdrawals (
    user_email,
    amount,
    held_amount,
    admin_fee,
    status,
    bank_name,
    account_number,
    account_name
  )
  values (
    v_profile.email,
    p_amount,
    v_held_amount,
    p_admin_fee,
    'Pending',
    v_bank_name,
    v_account_number,
    v_account_name
  )
  returning id into v_withdrawal_id;

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
    -v_held_amount,
    'Withdraw',
    format('Penarikan Rp%s (Pending Admin)', p_amount),
    v_profile.balance,
    v_new_balance
  );

  return v_withdrawal_id;
end;
$$;

-- New functions receive EXECUTE for PUBLIC by default in this production setup.
-- This RPC accepts a server-derived user UUID, so browser-facing roles must not call it.
revoke execute on function public.create_withdrawal_atomic(uuid, bigint, text, text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.create_withdrawal_atomic(uuid, bigint, text, text, text, bigint)
  to service_role;
