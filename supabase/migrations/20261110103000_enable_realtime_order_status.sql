-- Migration: 20261110103000_enable_realtime_order_status.sql
-- Description: Enable Supabase Realtime for orders (Live) and sandbox_orders (Tester-only)
-- Live orders: Scoped column access for Guest (anon) and Member (authenticated)
-- Sandbox orders: Exclusively for authenticated Testers, anon is 100% blocked

-- 1. Enable REPLICA IDENTITY FULL for non-primary-key filter support (order_id, user_id)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.sandbox_orders REPLICA IDENTITY FULL;

-- 2. Ensure both tables are registered in supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sandbox_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sandbox_orders;
  END IF;
END $$;

-- 3. Ensure Row Level Security is active
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sandbox_orders ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- TABEL ORDERS (LIVE) -> Mendukung Member (authenticated) & Guest (anon)
-- =========================================================================
GRANT SELECT (id, order_id, status, sn, notes, updated_at) ON public.orders TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view order status by order_id" ON public.orders;
CREATE POLICY "Public can view order status by order_id"
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- =========================================================================
-- TABEL SANDBOX_ORDERS -> EKSKLUSIF HANYA UNTUK TESTER (AUTHENTICATED ONLY)
-- ROLE 'ANON' 100% DITUTUP / TIDAK DIBERI AKSES SAMA SEKALI
-- =========================================================================
GRANT SELECT (id, order_id, status, sn, notes, updated_at) ON public.sandbox_orders TO authenticated;

DROP POLICY IF EXISTS "Tester can view sandbox order status by order_id" ON public.sandbox_orders;
CREATE POLICY "Tester can view sandbox order status by order_id"
  ON public.sandbox_orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_tester = true
    )
  );
