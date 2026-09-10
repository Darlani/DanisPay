-- Marketing Sandbox Batch 1B: customer read authorization transition.
-- Financial tables and financial RPC implementations remain unchanged.

DROP POLICY IF EXISTS "Tester can read own sandbox wallet" ON public.sandbox_wallets;
CREATE POLICY "Tester can read own sandbox wallet"
ON public.sandbox_wallets
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.sandbox_access
    WHERE sandbox_access.user_id = auth.uid()
      AND sandbox_access.state = 'ACTIVE'
  )
);

DROP POLICY IF EXISTS "Tester can read own sandbox logs" ON public.sandbox_balance_logs;
CREATE POLICY "Tester can read own sandbox logs"
ON public.sandbox_balance_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.sandbox_access
    WHERE sandbox_access.user_id = auth.uid()
      AND sandbox_access.state = 'ACTIVE'
  )
);

DROP POLICY IF EXISTS "Tester can read own sandbox orders" ON public.sandbox_orders;
CREATE POLICY "Tester can read own sandbox orders"
ON public.sandbox_orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.sandbox_access
    WHERE sandbox_access.user_id = auth.uid()
      AND sandbox_access.state = 'ACTIVE'
  )
);