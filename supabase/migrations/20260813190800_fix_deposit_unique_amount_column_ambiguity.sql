-- Qualify table columns that conflict with RETURNS TABLE output variables.
-- No allocation, reservation, validation, or ACL behavior changes here.
create or replace function public.create_deposit_with_unique_amount_atomic(
  p_user_id uuid,
  p_amount bigint,
  p_payment_channel text
)
returns table (
  deposit_id uuid,
  unique_code integer,
  total_amount bigint
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_profile public.profiles;
  v_payment_name text;
  v_payment_channel text;
  v_candidate integer;
  v_attempt integer;
  v_max_code integer;
  v_pending_count bigint;
  v_total bigint;
  v_reservation_id uuid;
  v_deposit_id uuid;
  v_constraint_name text;
begin
  if p_user_id is null then
    raise exception 'DEPOSIT_INVALID_USER';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'DEPOSIT_INVALID_AMOUNT';
  end if;

  if p_payment_channel is null
     or btrim(p_payment_channel) = ''
     or lower(btrim(p_payment_channel)) not in (
       'qris', 'dana', 'gopay', 'ovo', 'bni_manual', 'bsi_manual'
     ) then
    raise exception 'DEPOSIT_INVALID_PAYMENT_CHANNEL';
  end if;

  v_payment_channel := lower(btrim(p_payment_channel));

  select * into v_profile
  from public.profiles as p
  where p.id = p_user_id;

  if not found then
    raise exception 'DEPOSIT_PROFILE_NOT_FOUND';
  end if;

  if nullif(btrim(v_profile.email), '') is null then
    raise exception 'DEPOSIT_PROFILE_INVALID';
  end if;

  select pa.name into v_payment_name
  from public.payment_accounts as pa
  where pa.method_key = v_payment_channel
    and (v_payment_channel <> 'qris' or pa.is_qr is true);

  if not found or nullif(btrim(v_payment_name), '') is null then
    raise exception 'DEPOSIT_PAYMENT_METHOD_NOT_FOUND';
  end if;

  -- Route remains authoritative for deposit minimum, maintenance, and hours.
  delete from public.code_reservations as cr
  where cr.expired_at <= clock_timestamp();

  if exists (
    select 1 from public.deposits as d
    where d.user_email = v_profile.email
      and d.status = 'Pending'
  ) then
    raise exception 'DEPOSIT_PENDING_EXISTS';
  end if;

  select count(*) into v_pending_count
  from (
    select o.total_amount
    from public.orders as o
    where o.status = 'Pending' and o.total_amount is not null
    union all
    select d.total_amount::numeric
    from public.deposits as d
    where d.status = 'Pending' and d.total_amount is not null
  ) as pending_payments;

  v_max_code := case
    when v_pending_count > 350 then 999
    when v_pending_count > 170 then 500
    when v_pending_count > 70 then 200
    else 100
  end;

  for v_attempt in 1..5 loop
    v_candidate := floor(random() * case
      when v_attempt = 5 then 500
      else v_max_code
    end)::integer + 1;

    if p_amount > 9223372036854775807::bigint - v_candidate then
      raise exception 'DEPOSIT_TOTAL_OVERFLOW';
    end if;

    v_total := p_amount + v_candidate;

    if exists (
      select 1 from public.orders as o
      where o.status = 'Pending' and o.total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits as d
      where d.status = 'Pending' and d.total_amount = v_total
    ) then
      continue;
    end if;

    begin
      insert into public.code_reservations (total_amount, expired_at)
      values (v_total::numeric, clock_timestamp() + interval '5 minutes')
      returning id into v_reservation_id;
    exception
      when unique_violation then
        continue;
    end;

    if exists (
      select 1 from public.orders as o
      where o.status = 'Pending' and o.total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits as d
      where d.status = 'Pending' and d.total_amount = v_total
    ) then
      delete from public.code_reservations as cr where cr.id = v_reservation_id;
      v_reservation_id := null;
      continue;
    end if;

    begin
      insert into public.deposits (
        user_id, user_email, amount, unique_code, total_amount,
        payment_method, payment_channel, status
      )
      values (
        p_user_id, v_profile.email, p_amount, v_candidate, v_total,
        v_payment_name, v_payment_channel, 'Pending'
      )
      returning id into v_deposit_id;
    exception
      when unique_violation then
        get stacked diagnostics v_constraint_name = constraint_name;
        delete from public.code_reservations as cr where cr.id = v_reservation_id;
        v_reservation_id := null;

        if v_constraint_name = 'deposits_one_pending_per_user_email_idx' then
          raise exception 'DEPOSIT_PENDING_EXISTS';
        end if;

        if v_constraint_name = 'deposits_one_pending_total_amount_idx' then
          continue;
        end if;

        raise;
    end;

    delete from public.code_reservations as cr where cr.id = v_reservation_id;

    return query select v_deposit_id, v_candidate, v_total;
    return;
  end loop;

  for v_candidate in 1..2000 loop
    if p_amount > 9223372036854775807::bigint - v_candidate then
      raise exception 'DEPOSIT_TOTAL_OVERFLOW';
    end if;

    v_total := p_amount + v_candidate;

    if exists (
      select 1 from public.orders as o
      where o.status = 'Pending' and o.total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits as d
      where d.status = 'Pending' and d.total_amount = v_total
    ) then
      continue;
    end if;

    begin
      insert into public.code_reservations (total_amount, expired_at)
      values (v_total::numeric, clock_timestamp() + interval '5 minutes')
      returning id into v_reservation_id;
    exception
      when unique_violation then
        continue;
    end;

    if exists (
      select 1 from public.orders as o
      where o.status = 'Pending' and o.total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits as d
      where d.status = 'Pending' and d.total_amount = v_total
    ) then
      delete from public.code_reservations as cr where cr.id = v_reservation_id;
      v_reservation_id := null;
      continue;
    end if;

    begin
      insert into public.deposits (
        user_id, user_email, amount, unique_code, total_amount,
        payment_method, payment_channel, status
      )
      values (
        p_user_id, v_profile.email, p_amount, v_candidate, v_total,
        v_payment_name, v_payment_channel, 'Pending'
      )
      returning id into v_deposit_id;
    exception
      when unique_violation then
        get stacked diagnostics v_constraint_name = constraint_name;
        delete from public.code_reservations as cr where cr.id = v_reservation_id;
        v_reservation_id := null;

        if v_constraint_name = 'deposits_one_pending_per_user_email_idx' then
          raise exception 'DEPOSIT_PENDING_EXISTS';
        end if;

        if v_constraint_name = 'deposits_one_pending_total_amount_idx' then
          continue;
        end if;

        raise;
    end;

    delete from public.code_reservations as cr where cr.id = v_reservation_id;

    return query select v_deposit_id, v_candidate, v_total;
    return;
  end loop;

  raise exception 'DEPOSIT_UNIQUE_CODE_UNAVAILABLE';
end;
$$;

revoke all on function public.create_deposit_with_unique_amount_atomic(
  uuid, bigint, text
) from public, anon, authenticated;
grant execute on function public.create_deposit_with_unique_amount_atomic(
  uuid, bigint, text
) to service_role;
