create function public.get_member_balance_mutation_summary(
  p_user_id uuid
)
returns table (
  category text,
  mutation_count text,
  total_in text,
  total_out text,
  net_amount text
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user_email text;
begin
  if p_user_id is null then
    raise exception using
      errcode = '22023',
      message = 'MEMBER_BALANCE_SUMMARY_USER_ID_REQUIRED';
  end if;

  select p.email
    into v_user_email
  from public.profiles as p
  where p.id = p_user_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'MEMBER_BALANCE_SUMMARY_PROFILE_NOT_FOUND';
  end if;

  return query
  with categories(category, ordinal) as (
    values
      ('Deposit'::text, 1),
      ('Payment'::text, 2),
      ('Withdraw'::text, 3),
      ('Refund'::text, 4),
      ('Cashback'::text, 5),
      ('Referral'::text, 6),
      ('Bonus'::text, 7),
      ('AdminAdjustment'::text, 8),
      ('Upgrade'::text, 9),
      ('Other'::text, 10)
  ),
  member_logs as (
    select
      bl.id,
      bl.type,
      bl.amount
    from public.balance_logs as bl
    where bl.user_id = p_user_id
       or bl.user_email = v_user_email
  ),
  classified_logs as (
    select
      ml.id,
      case
        when ml.type in (
          'Deposit',
          'Payment',
          'Withdraw',
          'Refund',
          'Cashback',
          'Referral',
          'Bonus',
          'AdminAdjustment',
          'Upgrade'
        ) then ml.type
        else 'Other'
      end as category,
      ml.amount
    from member_logs as ml
  ),
  all_totals as (
    select
      count(*)::bigint as mutation_count,
      coalesce(
        sum(
          case
            when ml.amount > 0 then ml.amount::numeric
            else 0::numeric
          end
        ),
        0::numeric
      ) as total_in,
      coalesce(
        sum(
          case
            when ml.amount < 0 then -(ml.amount::numeric)
            else 0::numeric
          end
        ),
        0::numeric
      ) as total_out,
      coalesce(sum(ml.amount::numeric), 0::numeric) as net_amount
    from member_logs as ml
  ),
  category_totals as (
    select
      cl.category,
      count(*)::bigint as mutation_count,
      coalesce(
        sum(
          case
            when cl.amount > 0 then cl.amount::numeric
            else 0::numeric
          end
        ),
        0::numeric
      ) as total_in,
      coalesce(
        sum(
          case
            when cl.amount < 0 then -(cl.amount::numeric)
            else 0::numeric
          end
        ),
        0::numeric
      ) as total_out,
      coalesce(sum(cl.amount::numeric), 0::numeric) as net_amount
    from classified_logs as cl
    group by cl.category
  ),
  result_rows as (
    select
      0 as ordinal,
      'ALL'::text as category,
      a.mutation_count,
      a.total_in,
      a.total_out,
      a.net_amount
    from all_totals as a

    union all

    select
      c.ordinal,
      c.category,
      coalesce(ct.mutation_count, 0::bigint),
      coalesce(ct.total_in, 0::numeric),
      coalesce(ct.total_out, 0::numeric),
      coalesce(ct.net_amount, 0::numeric)
    from categories as c
    left join category_totals as ct
      on ct.category = c.category
  )
  select
    r.category,
    r.mutation_count::text,
    r.total_in::text,
    r.total_out::text,
    r.net_amount::text
  from result_rows as r
  order by r.ordinal;
end;
$$;

create index balance_logs_member_user_id_created_at_idx
  on public.balance_logs (user_id, created_at desc)
  where user_id is not null;

create index balance_logs_member_user_email_created_at_idx
  on public.balance_logs (user_email, created_at desc)
  where user_email is not null;

revoke execute on function public.get_member_balance_mutation_summary(uuid)
  from public, anon, authenticated;

grant execute on function public.get_member_balance_mutation_summary(uuid)
  to service_role;
