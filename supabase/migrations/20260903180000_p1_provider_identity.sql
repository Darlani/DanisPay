-- ============================================================================
-- MIGRATION: P.1 PROVIDER IDENTITY
-- DESCRIPTION: Add provider identity to items, transition to UNIQUE(provider, sku),
--              and add provider_used to orders.
-- ============================================================================

BEGIN;

-- 1. Precondition Assertion: Pastikan tidak ada duplikasi SKU sebelum mengubah constraint
DO $$
DECLARE
  v_dup_count int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'provider'
  ) THEN
    SELECT COUNT(*) INTO v_dup_count
    FROM (
      SELECT provider, sku, COUNT(*)
      FROM public.items
      GROUP BY provider, sku
      HAVING COUNT(*) > 1
    ) dup;
  ELSE
    SELECT COUNT(*) INTO v_dup_count
    FROM (
      SELECT sku, COUNT(*)
      FROM public.items
      GROUP BY sku
      HAVING COUNT(*) > 1
    ) dup;
  END IF;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Precondition Failed: % duplicate SKUs found in public.items. Aborting migration.', v_dup_count;
  END IF;
END $$;

-- 2. Tambah kolom provider pada public.items dengan DEFAULT 'DIGIFLAZZ' dan NOT NULL
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'DIGIFLAZZ';

-- 3. Pasang constraint penjamin format huruf kapital
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_schema = 'public' AND table_name = 'items' AND constraint_name = 'items_provider_format_check'
  ) THEN
    ALTER TABLE public.items 
    ADD CONSTRAINT items_provider_format_check CHECK (provider = UPPER(provider));
  END IF;
END $$;

-- 4. Transisi Keunikan: Hapus items_sku_key lama, pasang items_provider_sku_key
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_sku_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'items' AND constraint_name = 'items_provider_sku_key'
  ) THEN
    ALTER TABLE public.items 
    ADD CONSTRAINT items_provider_sku_key UNIQUE (provider, sku);
  END IF;
END $$;

-- 5. Tambah kolom provider_used pada public.orders untuk audit trail transaksi
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS provider_used text NULL;

COMMIT;
