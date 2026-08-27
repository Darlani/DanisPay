create function public.claim_order_transition_atomic(
  p_order_id uuid,
  p_expected_status text,
  p_target_status text,
  p_transition_kind text,
  p_source text
)
returns table (
  claimed boolean,
  current_status text,
  order_id uuid
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_order_id is null
     or p_expected_status is null
     or btrim(p_expected_status) = ''
     or p_target_status is null
     or btrim(p_target_status) = ''
     or p_transition_kind is null
     or btrim(p_transition_kind) = ''
     or p_source is null
     or btrim(p_source) = ''
     -- Only the currently integrated machine transition is enabled. Fulfillment
     -- sources remain fail-closed until their writers are reviewed and wired.
     or not (
       p_transition_kind = 'payment_accepted'
       and p_expected_status = 'Pending'
       and p_target_status = 'Diproses'
       and p_source = 'macrodroid'
     ) then
    raise exception using errcode = 'P0001', message = 'ORDER_TRANSITION_INVALID_INPUT';
  end if;

  select * into v_order
    from public.orders as o
   where o.id = p_order_id
   for update;

  if not found then
    return query select false, null::text, p_order_id;
    return;
  end if;

  if v_order.status is distinct from p_expected_status then
    return query select false, v_order.status, v_order.id;
    return;
  end if;

  update public.orders
     set status = p_target_status,
         updated_at = clock_timestamp()
   where id = v_order.id;

  return query select true, p_target_status, v_order.id;
end;
$$;

revoke execute on function public.claim_order_transition_atomic(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_order_transition_atomic(uuid, text, text, text, text)
  to service_role;
