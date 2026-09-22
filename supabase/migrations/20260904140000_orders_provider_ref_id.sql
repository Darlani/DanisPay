-- Migration: 20260904140000_orders_provider_ref_id.sql
-- Description: Add provider_ref_id to orders table with partial lookup index for multi-provider correlation

-- 1. Add nullable text column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS provider_ref_id text NULL;

-- 2. Create composite partial index scoped by provider
CREATE INDEX IF NOT EXISTS idx_orders_provider_ref_lookup 
ON public.orders (provider_used, provider_ref_id) 
WHERE provider_ref_id IS NOT NULL;
