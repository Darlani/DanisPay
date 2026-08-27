-- Secure admin deposit-approval RPC.
-- This migration is local only until explicitly reviewed and deployed.

create function public.approve_deposit_v5(
  p_deposit_id uuid,
  p_actor_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_role public.profiles.role%type;
  v_deposit public.deposits%rowtype;
  v_target public.profiles%rowtype;
  v_final_balance public.profiles.balance%type;
begin
  if p_deposit_id is null or p_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_INVALID_INPUT';
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
      message = 'DEPOSIT_ACTOR_NOT_FOUND';
  end if;

  if coalesce(lower(v_actor_role), '') not in ('admin', 'manager') then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_ACCESS_DENIED';
  end if;

  -- Lock the deposit before its profile. This makes concurrent approvals of
  -- the same deposit serialize and preserves the established deposit workflow.
  select *
    into v_deposit
    from public.deposits as d
   where d.id = p_deposit_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_NOT_FOUND';
  end if;

  if v_deposit.status is distinct from 'Pending' then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_ALREADY_PROCESSED';
  end if;

  if v_deposit.user_email is null
     or v_deposit.amount is null
     or v_deposit.amount <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_INVALID_DATA';
  end if;

  select *
    into v_target
    from public.profiles as p
   where p.email = v_deposit.user_email
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_PROFILE_NOT_FOUND';
  end if;

  if v_target.email is null or v_target.balance is null then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_PROFILE_INVALID';
  end if;

  if v_target.balance > 9223372036854775807::bigint - v_deposit.amount then
    raise exception using
      errcode = 'P0001',
      message = 'DEPOSIT_BALANCE_OVERFLOW';
  end if;

  v_final_balance := v_target.balance + v_deposit.amount;

  update public.deposits
     set status = 'Success'
   where id = v_deposit.id;

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
    v_deposit.amount,
    'Deposit',
    format('Deposit Sukses (ID: %s)', left(v_deposit.id::text, 8)),
    v_target.balance,
    v_final_balance
  );

  return;
end;
$$;

-- New functions receive EXECUTE for PUBLIC by default in this production setup.
-- This RPC accepts server-derived authority, so browser-facing roles must not
-- invoke it directly.
revoke execute on function public.approve_deposit_v5(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_deposit_v5(uuid, uuid)
  to service_role;
