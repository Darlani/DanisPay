create or replace function public._insert_order_from_trusted_payload(
  p_order_data jsonb,
  p_forced_status text,
  p_forced_user_id uuid,
  p_forced_email text,
  p_forced_used_balance bigint,
  p_forced_unique_code integer,
  p_forced_total_amount numeric,
  p_forced_idempotency_key uuid
)
returns public.orders
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_allowed_keys constant text[] := array[
    'order_id', 'api_ref_id', 'sku', 'product_name', 'item_label',
    'customer_no', 'buy_price', 'price', 'discount', 'voucher_code',
    'voucher_amount', 'cashback', 'payment_method', 'product_type',
    'manual_product_id', 'sn', 'user_contact', 'referred_by', 'category',
    'ip_address', 'device_id', 'raw_tagihan', 'customer_name',
    'segment_power', 'stand_meter', 'desc'
  ];
  v_payload public.orders;
  v_created public.orders;
begin
  if p_order_data is null or jsonb_typeof(p_order_data) <> 'object' then
    raise exception 'ORDER_INVALID_PAYLOAD';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_order_data) as supplied(key)
    where not (supplied.key = any (v_allowed_keys))
  ) then
    raise exception 'ORDER_UNSUPPORTED_PAYLOAD_FIELD';
  end if;

  if coalesce(nullif(btrim(p_order_data ->> 'order_id'), ''), '') = '' then
    raise exception 'ORDER_INVALID_ORDER_ID';
  end if;

  select *
  into v_payload
  from jsonb_populate_record(null::public.orders, p_order_data);

  insert into public.orders (
    order_id, api_ref_id, sku, product_name, item_label, customer_no,
    buy_price, price, discount, voucher_code, voucher_amount, cashback,
    payment_method, product_type, manual_product_id, sn, user_contact,
    referred_by, category, ip_address, device_id, raw_tagihan, customer_name,
    segment_power, stand_meter, "desc", status, user_id, email, used_balance,
    unique_code, total_amount, idempotency_key, created_at, updated_at
  )
  values (
    v_payload.order_id, v_payload.api_ref_id, v_payload.sku,
    v_payload.product_name, v_payload.item_label, v_payload.customer_no,
    v_payload.buy_price, v_payload.price, v_payload.discount,
    v_payload.voucher_code, v_payload.voucher_amount, v_payload.cashback,
    v_payload.payment_method, v_payload.product_type,
    v_payload.manual_product_id, v_payload.sn, v_payload.user_contact,
    v_payload.referred_by, v_payload.category, v_payload.ip_address,
    v_payload.device_id, v_payload.raw_tagihan, v_payload.customer_name,
    v_payload.segment_power, v_payload.stand_meter, v_payload."desc",
    p_forced_status, p_forced_user_id, p_forced_email,
    p_forced_used_balance, p_forced_unique_code, p_forced_total_amount,
    p_forced_idempotency_key, clock_timestamp(), clock_timestamp()
  )
  returning * into v_created;

  return v_created;
end;
$$;


create or replace function public.create_pending_order_from_reservation(
  p_reservation_id uuid,
  p_external_base_amount numeric,
  p_authenticated_user_id uuid,
  p_order_data jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_reservation public.code_reservations;
  v_profile_email text;
  v_unique_numeric numeric;
  v_unique_code integer;
  v_created public.orders;
begin
  if p_reservation_id is null then
    raise exception 'ORDER_RESERVATION_REQUIRED';
  end if;

  if p_external_base_amount is null
     or p_external_base_amount <= 0
     or p_external_base_amount <> trunc(p_external_base_amount) then
    raise exception 'ORDER_EXTERNAL_AMOUNT_INVALID';
  end if;

  select * into v_reservation
  from public.code_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'ORDER_RESERVATION_NOT_FOUND';
  end if;

  if v_reservation.expired_at <= clock_timestamp() then
    raise exception 'ORDER_RESERVATION_EXPIRED';
  end if;

  if v_reservation.total_amount <= 0
     or v_reservation.total_amount <> trunc(v_reservation.total_amount) then
    raise exception 'ORDER_RESERVATION_TOTAL_INVALID';
  end if;

  v_unique_numeric := v_reservation.total_amount - p_external_base_amount;

  if v_unique_numeric <> trunc(v_unique_numeric)
     or v_unique_numeric < 1
     or v_unique_numeric > 2000 then
    raise exception 'ORDER_RESERVATION_TOTAL_MISMATCH';
  end if;

  v_unique_code := v_unique_numeric::integer;

  if exists (
    select 1 from public.orders
    where status = 'Pending'
      and total_amount = v_reservation.total_amount
  ) or exists (
    select 1 from public.deposits
    where status = 'Pending'
      and total_amount::numeric = v_reservation.total_amount
  ) then
    raise exception 'ORDER_PENDING_TOTAL_EXISTS';
  end if;

  if p_authenticated_user_id is not null then
    select email into v_profile_email
    from public.profiles
    where id = p_authenticated_user_id;

    if not found or nullif(btrim(v_profile_email), '') is null then
      raise exception 'ORDER_PROFILE_INVALID';
    end if;
  end if;

  v_created := public._insert_order_from_trusted_payload(
    p_order_data,
    'Pending',
    p_authenticated_user_id,
    v_profile_email,
    0,
    v_unique_code,
    v_reservation.total_amount,
    null
  );

  delete from public.code_reservations
  where id = v_reservation.id;

  return to_jsonb(v_created);
end;
$$;


create or replace function public.create_mixed_order_from_reservation_atomic(
  p_reservation_id uuid,
  p_user_id uuid,
  p_idempotency_key uuid,
  p_requested_coin_amount bigint,
  p_external_base_amount numeric,
  p_order_data jsonb
)
returns table (
  order_data jsonb,
  initial_balance bigint,
  final_balance bigint
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_existing public.orders;
  v_reservation public.code_reservations;
  v_profile public.profiles;
  v_created public.orders;
  v_unique_numeric numeric;
  v_unique_code integer;
  v_initial_balance bigint;
  v_final_balance bigint;
  v_constraint_name text;
begin
  if p_user_id is null then
    raise exception 'ORDER_INVALID_USER';
  end if;

  if p_idempotency_key is null then
    raise exception 'ORDER_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into v_existing
  from public.orders
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    select * into v_profile
    from public.profiles
    where id = p_user_id;

    if not found then
      raise exception 'ORDER_PROFILE_NOT_FOUND';
    end if;

    if v_profile.balance is null then
      raise exception 'ORDER_PROFILE_INVALID';
    end if;

    v_final_balance := v_profile.balance;

    return query
    select to_jsonb(v_existing), null::bigint, v_final_balance;
    return;
  end if;

  if p_reservation_id is null then
    raise exception 'ORDER_RESERVATION_REQUIRED';
  end if;

  if p_requested_coin_amount is null or p_requested_coin_amount <= 0 then
    raise exception 'ORDER_COIN_AMOUNT_INVALID';
  end if;

  if p_external_base_amount is null
     or p_external_base_amount <= 0
     or p_external_base_amount <> trunc(p_external_base_amount) then
    raise exception 'ORDER_EXTERNAL_AMOUNT_INVALID';
  end if;

  select * into v_reservation
  from public.code_reservations
  where id = p_reservation_id
  for update;

  if not found then
    select * into v_existing
    from public.orders
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    if found then
      select * into v_profile
      from public.profiles
      where id = p_user_id;

      if not found then
        raise exception 'ORDER_PROFILE_NOT_FOUND';
      end if;

      if v_profile.balance is null then
        raise exception 'ORDER_PROFILE_INVALID';
      end if;

      v_final_balance := v_profile.balance;

      return query
      select to_jsonb(v_existing), null::bigint, v_final_balance;
      return;
    end if;

    raise exception 'ORDER_RESERVATION_NOT_FOUND';
  end if;

  if v_reservation.expired_at <= clock_timestamp() then
    select * into v_existing
    from public.orders
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    if found then
      select * into v_profile
      from public.profiles
      where id = p_user_id;

      if not found then
        raise exception 'ORDER_PROFILE_NOT_FOUND';
      end if;

      if v_profile.balance is null then
        raise exception 'ORDER_PROFILE_INVALID';
      end if;

      v_final_balance := v_profile.balance;

      return query
      select to_jsonb(v_existing), null::bigint, v_final_balance;
      return;
    end if;

    raise exception 'ORDER_RESERVATION_EXPIRED';
  end if;

  if v_reservation.total_amount <= 0
     or v_reservation.total_amount <> trunc(v_reservation.total_amount) then
    raise exception 'ORDER_RESERVATION_TOTAL_INVALID';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'ORDER_PROFILE_NOT_FOUND';
  end if;

  if v_profile.balance is null
     or nullif(btrim(v_profile.email), '') is null then
    raise exception 'ORDER_PROFILE_INVALID';
  end if;

  if v_profile.balance < p_requested_coin_amount then
    raise exception 'ORDER_INSUFFICIENT_BALANCE';
  end if;

  v_unique_numeric := v_reservation.total_amount - p_external_base_amount;

  if v_unique_numeric <> trunc(v_unique_numeric)
     or v_unique_numeric < 1
     or v_unique_numeric > 2000 then
    raise exception 'ORDER_RESERVATION_TOTAL_MISMATCH';
  end if;

  v_unique_code := v_unique_numeric::integer;

  if exists (
    select 1 from public.orders
    where status = 'Pending'
      and total_amount = v_reservation.total_amount
  ) or exists (
    select 1 from public.deposits
    where status = 'Pending'
      and total_amount::numeric = v_reservation.total_amount
  ) then
    raise exception 'ORDER_PENDING_TOTAL_EXISTS';
  end if;

  v_initial_balance := v_profile.balance;
  v_final_balance := v_initial_balance - p_requested_coin_amount;

  begin
    v_created := public._insert_order_from_trusted_payload(
      p_order_data,
      'Pending',
      p_user_id,
      v_profile.email,
      p_requested_coin_amount,
      v_unique_code,
      v_reservation.total_amount,
      p_idempotency_key
    );

    update public.profiles
    set balance = v_final_balance
    where id = p_user_id;

    insert into public.balance_logs (
      user_id, user_email, amount, type, description, initial_balance, final_balance
    )
    values (
      p_user_id,
      v_profile.email,
      -p_requested_coin_amount,
      'Payment',
      format('Pembayaran pesanan %s', v_created.order_id),
      v_initial_balance,
      v_final_balance
    );

    delete from public.code_reservations
    where id = v_reservation.id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if v_constraint_name <> 'orders_member_idempotency_key_idx' then
        raise;
      end if;

      select * into v_existing
      from public.orders
      where user_id = p_user_id
        and idempotency_key = p_idempotency_key;

      if not found then
        raise;
      end if;

      select * into v_profile
      from public.profiles
      where id = p_user_id;

      if not found then
        raise exception 'ORDER_PROFILE_NOT_FOUND';
      end if;

      if v_profile.balance is null then
        raise exception 'ORDER_PROFILE_INVALID';
      end if;

      v_final_balance := v_profile.balance;

      return query
      select to_jsonb(v_existing), null::bigint, v_final_balance;
      return;
  end;

  return query
  select to_jsonb(v_created), v_initial_balance, v_final_balance;
end;
$$;


create or replace function public.create_full_coin_order_atomic(
  p_user_id uuid,
  p_idempotency_key uuid,
  p_required_coin_amount bigint,
  p_order_data jsonb
)
returns table (
  order_data jsonb,
  initial_balance bigint,
  final_balance bigint
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_existing public.orders;
  v_profile public.profiles;
  v_created public.orders;
  v_initial_balance bigint;
  v_final_balance bigint;
  v_constraint_name text;
begin
  if p_user_id is null then
    raise exception 'ORDER_INVALID_USER';
  end if;

  if p_idempotency_key is null then
    raise exception 'ORDER_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into v_existing
  from public.orders
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    select * into v_profile
    from public.profiles
    where id = p_user_id;

    if not found then
      raise exception 'ORDER_PROFILE_NOT_FOUND';
    end if;

    if v_profile.balance is null then
      raise exception 'ORDER_PROFILE_INVALID';
    end if;

    v_final_balance := v_profile.balance;

    return query
    select to_jsonb(v_existing), null::bigint, v_final_balance;
    return;
  end if;

  if p_required_coin_amount is null or p_required_coin_amount <= 0 then
    raise exception 'ORDER_COIN_AMOUNT_INVALID';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'ORDER_PROFILE_NOT_FOUND';
  end if;

  if v_profile.balance is null
     or nullif(btrim(v_profile.email), '') is null then
    raise exception 'ORDER_PROFILE_INVALID';
  end if;

  if v_profile.balance < p_required_coin_amount then
    raise exception 'ORDER_INSUFFICIENT_BALANCE';
  end if;

  v_initial_balance := v_profile.balance;
  v_final_balance := v_initial_balance - p_required_coin_amount;

  begin
    -- For full-Koin only, total_amount is the remaining external payable
    -- amount. A value of zero does not mean the economic product value is zero.
    v_created := public._insert_order_from_trusted_payload(
      p_order_data,
      'Diproses',
      p_user_id,
      v_profile.email,
      p_required_coin_amount,
      0,
      0,
      p_idempotency_key
    );

    update public.profiles
    set balance = v_final_balance
    where id = p_user_id;

    insert into public.balance_logs (
      user_id, user_email, amount, type, description, initial_balance, final_balance
    )
    values (
      p_user_id,
      v_profile.email,
      -p_required_coin_amount,
      'Payment',
      format('Pembayaran pesanan %s', v_created.order_id),
      v_initial_balance,
      v_final_balance
    );
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if v_constraint_name <> 'orders_member_idempotency_key_idx' then
        raise;
      end if;

      select * into v_existing
      from public.orders
      where user_id = p_user_id
        and idempotency_key = p_idempotency_key;

      if not found then
        raise;
      end if;

      select * into v_profile
      from public.profiles
      where id = p_user_id;

      if not found then
        raise exception 'ORDER_PROFILE_NOT_FOUND';
      end if;

      if v_profile.balance is null then
        raise exception 'ORDER_PROFILE_INVALID';
      end if;

      v_final_balance := v_profile.balance;

      return query
      select to_jsonb(v_existing), null::bigint, v_final_balance;
      return;
  end;

  return query
  select to_jsonb(v_created), v_initial_balance, v_final_balance;
end;
$$;


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
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'DEPOSIT_PROFILE_NOT_FOUND';
  end if;

  if nullif(btrim(v_profile.email), '') is null then
    raise exception 'DEPOSIT_PROFILE_INVALID';
  end if;

  select name into v_payment_name
  from public.payment_accounts
  where method_key = v_payment_channel
    and (v_payment_channel <> 'qris' or is_qr is true);

  if not found or nullif(btrim(v_payment_name), '') is null then
    raise exception 'DEPOSIT_PAYMENT_METHOD_NOT_FOUND';
  end if;

  -- Route remains authoritative for deposit minimum, maintenance, and hours.
  delete from public.code_reservations
  where expired_at <= clock_timestamp();

  if exists (
    select 1 from public.deposits
    where user_email = v_profile.email
      and status = 'Pending'
  ) then
    raise exception 'DEPOSIT_PENDING_EXISTS';
  end if;

  select count(*) into v_pending_count
  from (
    select total_amount from public.orders
    where status = 'Pending' and total_amount is not null
    union all
    select total_amount::numeric from public.deposits
    where status = 'Pending' and total_amount is not null
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
      select 1 from public.orders
      where status = 'Pending' and total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits
      where status = 'Pending' and total_amount = v_total
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
      select 1 from public.orders
      where status = 'Pending' and total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits
      where status = 'Pending' and total_amount = v_total
    ) then
      delete from public.code_reservations where id = v_reservation_id;
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
        delete from public.code_reservations where id = v_reservation_id;
        v_reservation_id := null;

        if v_constraint_name = 'deposits_one_pending_per_user_email_idx' then
          raise exception 'DEPOSIT_PENDING_EXISTS';
        end if;

        if v_constraint_name = 'deposits_one_pending_total_amount_idx' then
          continue;
        end if;

        raise;
    end;

    delete from public.code_reservations where id = v_reservation_id;

    return query select v_deposit_id, v_candidate, v_total;
    return;
  end loop;

  for v_candidate in 1..2000 loop
    if p_amount > 9223372036854775807::bigint - v_candidate then
      raise exception 'DEPOSIT_TOTAL_OVERFLOW';
    end if;

    v_total := p_amount + v_candidate;

    if exists (
      select 1 from public.orders
      where status = 'Pending' and total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits
      where status = 'Pending' and total_amount = v_total
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
      select 1 from public.orders
      where status = 'Pending' and total_amount = v_total::numeric
    ) or exists (
      select 1 from public.deposits
      where status = 'Pending' and total_amount = v_total
    ) then
      delete from public.code_reservations where id = v_reservation_id;
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
        delete from public.code_reservations where id = v_reservation_id;
        v_reservation_id := null;

        if v_constraint_name = 'deposits_one_pending_per_user_email_idx' then
          raise exception 'DEPOSIT_PENDING_EXISTS';
        end if;

        if v_constraint_name = 'deposits_one_pending_total_amount_idx' then
          continue;
        end if;

        raise;
    end;

    delete from public.code_reservations where id = v_reservation_id;

    return query select v_deposit_id, v_candidate, v_total;
    return;
  end loop;

  raise exception 'DEPOSIT_UNIQUE_CODE_UNAVAILABLE';
end;
$$;


revoke all on function public._insert_order_from_trusted_payload(
  jsonb, text, uuid, text, bigint, integer, numeric, uuid
) from public, anon, authenticated;

revoke all on function public.create_pending_order_from_reservation(
  uuid, numeric, uuid, jsonb
) from public, anon, authenticated;

revoke all on function public.create_mixed_order_from_reservation_atomic(
  uuid, uuid, uuid, bigint, numeric, jsonb
) from public, anon, authenticated;

revoke all on function public.create_full_coin_order_atomic(
  uuid, uuid, bigint, jsonb
) from public, anon, authenticated;

revoke all on function public.create_deposit_with_unique_amount_atomic(
  uuid, bigint, text
) from public, anon, authenticated;

grant execute on function public._insert_order_from_trusted_payload(
  jsonb, text, uuid, text, bigint, integer, numeric, uuid
) to service_role;

grant execute on function public.create_pending_order_from_reservation(
  uuid, numeric, uuid, jsonb
) to service_role;

grant execute on function public.create_mixed_order_from_reservation_atomic(
  uuid, uuid, uuid, bigint, numeric, jsonb
) to service_role;

grant execute on function public.create_full_coin_order_atomic(
  uuid, uuid, bigint, jsonb
) to service_role;

grant execute on function public.create_deposit_with_unique_amount_atomic(
  uuid, bigint, text
) to service_role;
