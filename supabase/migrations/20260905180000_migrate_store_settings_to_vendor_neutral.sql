-- Migration: Migrate store_settings to Vendor-Neutral Operational Mode
-- Purpose:
-- 1. Introduce canonical 'is_live_mode' (default: true) representing system-wide master mode (LIVE vs SANDBOX).
-- 2. Drop redundant 'is_maintenance_digiflazz' (canonical provider maintenance lives in public.providers.is_maintenance).
-- 3. Drop redundant 'balance_digiflazz' (canonical provider balance lives in public.providers.balance).
-- 4. Drop legacy misnomer 'is_digiflazz_active' after propagating its boolean value to 'is_live_mode'.

DO $$
BEGIN
  -- 1. Ensure is_live_mode column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'store_settings' 
      AND column_name = 'is_live_mode'
  ) THEN
    ALTER TABLE public.store_settings ADD COLUMN is_live_mode boolean NOT NULL DEFAULT true;
    
    -- Copy value from is_digiflazz_active if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'store_settings' 
        AND column_name = 'is_digiflazz_active'
    ) THEN
      UPDATE public.store_settings SET is_live_mode = COALESCE(is_digiflazz_active, true);
    END IF;
  END IF;
END $$;

-- 2. Drop redundant provider columns from store_settings
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS is_maintenance_digiflazz;
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS balance_digiflazz;
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS is_digiflazz_active;

