create function public.get_member_last_activity_for_ids(
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  last_activity_at timestamptz
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if p_user_ids is null then
    raise exception using
      errcode = '22023',
      message = 'MEMBER_ACTIVITY_USER_IDS_REQUIRED';
  end if;

  if cardinality(p_user_ids) = 0 then
    return;
  end if;

  if cardinality(p_user_ids) > 5000 then
    raise exception using
      errcode = '22023',
      message = 'MEMBER_ACTIVITY_USER_IDS_LIMIT_EXCEEDED';
  end if;

  if exists (
    select 1
    from unnest(p_user_ids) as requested(user_id)
    where requested.user_id is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'MEMBER_ACTIVITY_USER_IDS_INVALID';
  end if;

  return query
  with target_profiles as (
    select
      p.id,
      p.email
    from public.profiles as p
    where p.id = any(p_user_ids)
  )
  select
    t.id as user_id,
    latest.last_activity_at
  from target_profiles as t
  left join lateral (
    select o.created_at
    from public.orders as o
    where o.user_id = t.id
      and o.created_at is not null
    order by o.created_at desc
    limit 1
  ) as order_activity on true
  left join lateral (
    select d.created_at
    from public.deposits as d
    where d.user_id = t.id
      and d.created_at is not null
    order by d.created_at desc
    limit 1
  ) as current_deposit_activity on true
  left join lateral (
    select d.created_at
    from public.deposits as d
    where d.user_id is null
      and d.user_email = t.email
      and d.created_at is not null
    order by d.created_at desc
    limit 1
  ) as legacy_deposit_activity on true
  left join lateral (
    select w.created_at
    from public.withdrawals as w
    where w.user_email = t.email
      and w.created_at is not null
    order by w.created_at desc
    limit 1
  ) as withdrawal_activity on true
  cross join lateral (
    select max(candidate.activity_at) as last_activity_at
    from (
      values
        (order_activity.created_at),
        (current_deposit_activity.created_at),
        (legacy_deposit_activity.created_at),
        (withdrawal_activity.created_at)
    ) as candidate(activity_at)
  ) as latest;
end;
$$;

create index orders_member_activity_latest_idx
  on public.orders (user_id, created_at desc)
  where user_id is not null
    and created_at is not null;

create index deposits_member_activity_latest_idx
  on public.deposits (user_id, created_at desc)
  where user_id is not null
    and created_at is not null;

create index deposits_legacy_member_activity_latest_idx
  on public.deposits (user_email, created_at desc)
  where user_id is null
    and user_email is not null
    and created_at is not null;

create index withdrawals_member_activity_latest_idx
  on public.withdrawals (user_email, created_at desc)
  where user_email is not null
    and created_at is not null;

revoke execute on function public.get_member_last_activity_for_ids(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_member_last_activity_for_ids(uuid[])
  to service_role;
