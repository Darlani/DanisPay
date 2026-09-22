create function public.reject_deposit_atomic(
  p_deposit_id uuid,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor public.profiles%rowtype;
  v_deposit public.deposits%rowtype;
begin
  if p_deposit_id is null or p_actor_user_id is null then
    raise exception using errcode = 'P0001', message = 'DEPOSIT_REJECT_INVALID_INPUT';
  end if;

  select * into v_actor
    from public.profiles as p
   where p.id = p_actor_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'DEPOSIT_REJECT_ACTOR_NOT_FOUND';
  end if;

  if coalesce(lower(v_actor.role), '') not in ('admin', 'manager')
     or nullif(btrim(v_actor.email), '') is null then
    raise exception using errcode = 'P0001', message = 'DEPOSIT_REJECT_ACCESS_DENIED';
  end if;

  -- Deposit is always locked before any decision. Concurrent approval/reject
  -- callers serialize here; only the caller that still sees Pending wins.
  select * into v_deposit
    from public.deposits as d
   where d.id = p_deposit_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'DEPOSIT_REJECT_NOT_FOUND';
  end if;

  if v_deposit.status is distinct from 'Pending' then
    return false;
  end if;

  update public.deposits
     set status = 'Rejected'
   where id = v_deposit.id;

  insert into public.admin_logs (admin_email, action, target, details)
  values (
    v_actor.email,
    'REJECT_DEPOSIT',
    v_deposit.id::text,
    format('Deposit ditolak oleh %s.', lower(v_actor.role))
  );

  return true;
end;
$$;

revoke all on function public.reject_deposit_atomic(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reject_deposit_atomic(uuid, uuid)
  to service_role;
