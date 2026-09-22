-- Migration: 20260906201000_fix_insert_order_from_trusted_payload.sql
-- Description: Drop accidental overload of _insert_order_from_trusted_payload and update canonical function to remove is_sandbox column

-- 1. Drop accidental overload with text idempotency_key
DROP FUNCTION IF EXISTS public._insert_order_from_trusted_payload(jsonb, text, uuid, text, numeric, integer, numeric, text);

-- 2. Update canonical function with correct types (bigint used_balance, uuid idempotency_key) without is_sandbox column
CREATE OR REPLACE FUNCTION public._insert_order_from_trusted_payload(
  p_order_data jsonb,
  p_forced_status text,
  p_forced_user_id uuid,
  p_forced_email text,
  p_forced_used_balance bigint,
  p_forced_unique_code integer,
  p_forced_total_amount numeric,
  p_forced_idempotency_key uuid
)
RETURNS public.orders
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public._insert_order_from_trusted_payload(jsonb, text, uuid, text, bigint, integer, numeric, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._insert_order_from_trusted_payload(jsonb, text, uuid, text, bigint, integer, numeric, uuid) TO service_role;

