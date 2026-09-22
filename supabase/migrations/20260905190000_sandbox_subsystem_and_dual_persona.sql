-- Migration: Dual-Persona Sandbox & Isolated Shadow Financial Subsystem
-- Purpose:
-- 1. Add 'is_sandbox' (boolean NOT NULL DEFAULT false) to public.orders with index.
-- 2. Add immutability trigger on public.orders preventing alteration of 'is_sandbox'.
-- 3. Add 'is_tester' (boolean NOT NULL DEFAULT false) to public.profiles.
-- 4. Create isolated table public.sandbox_wallets with RLS.
-- 5. Create isolated table public.sandbox_balance_logs with RLS.
-- 6. Update public._insert_order_from_trusted_payload RPC to accept 'is_sandbox'.

-- 1. Orders: is_sandbox column & index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'is_sandbox'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN is_sandbox boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_is_sandbox ON public.orders(is_sandbox);

-- Backfill legacy simulation orders
UPDATE public.orders 
SET is_sandbox = true 
WHERE sn ILIKE 'SIM-%' AND is_sandbox = false;

-- 2. Database-level immutability trigger for orders.is_sandbox
CREATE OR REPLACE FUNCTION public.enforce_orders_is_sandbox_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_sandbox IS DISTINCT FROM NEW.is_sandbox THEN
    RAISE EXCEPTION 'CANNOT_MODIFY_IMMUTABLE_FIELD: orders.is_sandbox cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_orders_is_sandbox ON public.orders;
CREATE TRIGGER trg_protect_orders_is_sandbox
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_orders_is_sandbox_immutability();

-- 3. Profiles: is_tester flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'is_tester'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_tester boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4. Sandbox Wallets
CREATE TABLE IF NOT EXISTS public.sandbox_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 1000000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sandbox_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tester can read own sandbox wallet" ON public.sandbox_wallets;
CREATE POLICY "Tester can read own sandbox wallet"
ON public.sandbox_wallets
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_tester = true
  )
);

-- 5. Sandbox Balance Logs
CREATE TABLE IF NOT EXISTS public.sandbox_balance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email text,
  amount bigint NOT NULL,
  type text NOT NULL,
  description text,
  initial_balance bigint,
  final_balance bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sandbox_balance_logs_user ON public.sandbox_balance_logs(user_id);

ALTER TABLE public.sandbox_balance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tester can read own sandbox logs" ON public.sandbox_balance_logs;
CREATE POLICY "Tester can read own sandbox logs"
ON public.sandbox_balance_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_tester = true
  )
);

-- 6. Update _insert_order_from_trusted_payload
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
RETURNS orders
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
    'segment_power', 'stand_meter', 'desc', 'is_sandbox'
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
    unique_code, total_amount, idempotency_key, is_sandbox, created_at, updated_at
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
    p_forced_idempotency_key, coalesce(v_payload.is_sandbox, false), clock_timestamp(), clock_timestamp()
  )
  returning * into v_created;

  return v_created;
end;
$function$;

