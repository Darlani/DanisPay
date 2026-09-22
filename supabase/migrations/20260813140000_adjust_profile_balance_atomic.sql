-- Secure admin balance-adjustment RPC.
-- This migration is local only until explicitly reviewed and deployed.

create function public.adjust_profile_balance_atomic(
  p_target_user_id uuid,
  p_delta bigint,
  p_reason text,
  p_actor_user_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor_email public.profiles.email%type;
  v_target public.profiles%rowtype;
  v_reason text;
  v_final_balance public.profiles.balance%type;
  v_balance_log_id public.balance_logs.id%type;
begin
  if p_target_user_id is null or p_actor_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_INVALID_USER';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_INVALID_DELTA';
  end if;

  v_reason := btrim(p_reason);

  if v_reason is null or v_reason = '' then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_INVALID_REASON';
  end if;

  -- The API route derives this UUID from a verified Bearer token. The email is
  -- resolved inside the transaction instead of trusting a browser-provided value.
  select p.email
    into v_actor_email
    from public.profiles as p
   where p.id = p_actor_user_id;

  if not found or v_actor_email is null then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_ACTOR_NOT_FOUND';
  end if;

  -- This is the wallet serialization point. Do not lock withdrawal rows here:
  -- approve/reject lock withdrawal before profile, while this RPC locks only profile.
  select *
    into v_target
    from public.profiles as p
   where p.id = p_target_user_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_TARGET_NOT_FOUND';
  end if;

  if v_target.email is null or v_target.balance is null then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_TARGET_BALANCE_INVALID';
  end if;

  -- Protect bigint arithmetic before calculating the final balance.
  if p_delta > 0
     and v_target.balance > 9223372036854775807::bigint - p_delta then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_BALANCE_OVERFLOW';
  end if;

  if p_delta < 0
     and v_target.balance < (-9223372036854775807::bigint - 1::bigint) - p_delta then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_BALANCE_OVERFLOW';
  end if;

  v_final_balance := v_target.balance + p_delta;

  if v_final_balance < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'ADJUSTMENT_INSUFFICIENT_BALANCE';
  end if;

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
    p_delta,
    'AdminAdjustment',
    v_reason,
    v_target.balance,
    v_final_balance
  )
  returning id into v_balance_log_id;

  insert into public.admin_logs (
    admin_email,
    action,
    target,
    details
  )
  values (
    v_actor_email,
    'ADJUST_BALANCE',
    format('profile:%s', v_target.id),
    format(
      'delta=%s; initial_balance=%s; final_balance=%s; reason=%s',
      p_delta,
      v_target.balance,
      v_final_balance,
      v_reason
    )
  );

  return v_balance_log_id;
end;
$$;

-- New functions receive EXECUTE for PUBLIC by default in this production setup.
-- Keep browser-facing roles unable to call an RPC that accepts a target UUID.
revoke execute on function public.adjust_profile_balance_atomic(uuid, bigint, text, uuid)
  from public, anon, authenticated;
grant execute on function public.adjust_profile_balance_atomic(uuid, bigint, text, uuid)
  to service_role;
