-- Secure admin withdrawal approve/reject RPCs.
-- This migration is local only until explicitly reviewed and deployed.

create function public.approve_withdraw_v5(
  p_withdrawal_id uuid,
  p_final_fee bigint,
  p_actor_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_role public.profiles.role%type;
  v_withdrawal public.withdrawals%rowtype;
  v_target public.profiles%rowtype;
  v_total_with_final_fee bigint;
  v_refund public.withdrawals.held_amount%type;
  v_final_balance public.profiles.balance%type;
begin
  if p_withdrawal_id is null or p_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_INPUT';
  end if;

  if p_final_fee is null or p_final_fee < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_FEE';
  end if;

  -- The route derives this UUID from a verified Bearer token. Resolve the
  -- actor's role here instead of trusting browser-provided authority claims.
  select p.role
    into v_actor_role
    from public.profiles as p
   where p.id = p_actor_user_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_ACTOR_NOT_FOUND';
  end if;

  if coalesce(lower(v_actor_role), '') not in ('admin', 'manager') then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_ACCESS_DENIED';
  end if;

  -- Preserve V4's lock order: withdrawal first, then its profile.
  select *
    into v_withdrawal
    from public.withdrawals as w
   where w.id = p_withdrawal_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_NOT_FOUND';
  end if;

  if v_withdrawal.status is distinct from 'Pending' then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_ALREADY_PROCESSED';
  end if;

  if v_withdrawal.user_email is null
     or v_withdrawal.amount is null
     or v_withdrawal.amount <= 0
     or v_withdrawal.held_amount is null
     or v_withdrawal.held_amount < v_withdrawal.amount then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_DATA';
  end if;

  if v_withdrawal.amount > 9223372036854775807::bigint - p_final_fee then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_FEE_OVERFLOW';
  end if;

  v_total_with_final_fee := v_withdrawal.amount + p_final_fee;

  select *
    into v_target
    from public.profiles as p
   where p.email = v_withdrawal.user_email
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_PROFILE_NOT_FOUND';
  end if;

  if v_target.email is null or v_target.balance is null then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_PROFILE_INVALID';
  end if;

  -- V4 permits a final fee above the originally held fee. The subtraction is
  -- safe here: held_amount is non-negative and the prior addition was checked
  -- for bigint overflow, so the result is within bigint range. Only a positive
  -- result is refundable; zero or negative results do not debit again.
  v_refund := v_withdrawal.held_amount - v_total_with_final_fee;

  update public.withdrawals
     set status = 'Success',
         admin_fee = p_final_fee
   where id = v_withdrawal.id;

  if v_refund > 0 then
    if v_target.balance > 9223372036854775807::bigint - v_refund then
      raise exception using
        errcode = 'P0001',
        message = 'WITHDRAWAL_BALANCE_OVERFLOW';
    end if;

    v_final_balance := v_target.balance + v_refund;

    update public.profiles
       set balance = v_final_balance
     where id = v_target.id;

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
      v_target.id,
      v_target.email,
      v_refund,
      'Refund',
      format('Refund Selisih Biaya Penarikan (ID: %s)', left(v_withdrawal.id::text, 8)),
      v_target.balance,
      v_final_balance
    );
  end if;

  return;
end;
$$;

create function public.reject_withdraw_v5(
  p_withdrawal_id uuid,
  p_actor_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_role public.profiles.role%type;
  v_withdrawal public.withdrawals%rowtype;
  v_target public.profiles%rowtype;
  v_final_balance public.profiles.balance%type;
begin
  if p_withdrawal_id is null or p_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_INPUT';
  end if;

  select p.role
    into v_actor_role
    from public.profiles as p
   where p.id = p_actor_user_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_ACTOR_NOT_FOUND';
  end if;

  if coalesce(lower(v_actor_role), '') not in ('admin', 'manager') then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_ACCESS_DENIED';
  end if;

  -- Preserve V4's lock order: withdrawal first, then its profile.
  select *
    into v_withdrawal
    from public.withdrawals as w
   where w.id = p_withdrawal_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_NOT_FOUND';
  end if;

  if v_withdrawal.status is distinct from 'Pending' then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_ALREADY_PROCESSED';
  end if;

  if v_withdrawal.user_email is null
     or v_withdrawal.held_amount is null
     or v_withdrawal.held_amount < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_INVALID_DATA';
  end if;

  select *
    into v_target
    from public.profiles as p
   where p.email = v_withdrawal.user_email
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_PROFILE_NOT_FOUND';
  end if;

  if v_target.email is null or v_target.balance is null then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_PROFILE_INVALID';
  end if;

  if v_target.balance > 9223372036854775807::bigint - v_withdrawal.held_amount then
    raise exception using
      errcode = 'P0001',
      message = 'WITHDRAWAL_BALANCE_OVERFLOW';
  end if;

  v_final_balance := v_target.balance + v_withdrawal.held_amount;

  update public.withdrawals
     set status = 'Rejected'
   where id = v_withdrawal.id;

  update public.profiles
     set balance = v_final_balance
   where id = v_target.id;

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
    v_target.id,
    v_target.email,
    v_withdrawal.held_amount,
    'Refund',
    format('Refund Penarikan Ditolak (ID: %s)', left(v_withdrawal.id::text, 8)),
    v_target.balance,
    v_final_balance
  );

  return;
end;
$$;

-- New functions receive EXECUTE for PUBLIC by default in this production setup.
-- These RPCs accept server-derived actor UUIDs, so browser-facing roles must
-- not invoke them directly.
revoke execute on function public.approve_withdraw_v5(uuid, bigint, uuid)
  from public, anon, authenticated;
revoke execute on function public.reject_withdraw_v5(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_withdraw_v5(uuid, bigint, uuid)
  to service_role;
grant execute on function public.reject_withdraw_v5(uuid, uuid)
  to service_role;
