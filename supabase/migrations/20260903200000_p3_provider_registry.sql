-- Migration: 20260903200000_p3_provider_registry.sql
-- Description: P.3A Provider Registry & Dynamic Control Foundation

CREATE TABLE IF NOT EXISTS public.providers (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text NULL,
    is_enabled boolean NOT NULL DEFAULT false,
    is_catalog_enabled boolean NOT NULL DEFAULT false,
    is_execution_enabled boolean NOT NULL DEFAULT false,
    is_maintenance boolean NOT NULL DEFAULT false,
    balance numeric NOT NULL DEFAULT 0,
    health_status text NOT NULL DEFAULT 'UNKNOWN',
    last_sync_at timestamptz NULL,
    last_sync_status text NULL,
    last_error text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_providers_code_upper CHECK (code = UPPER(code)),
    CONSTRAINT chk_providers_health_status CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN')),
    CONSTRAINT chk_providers_state_consistency CHECK (is_enabled = true OR (is_catalog_enabled = false AND is_execution_enabled = false))
);

-- Row Level Security
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'providers' AND policyname = 'Allow service_role full access on providers'
    ) THEN
        CREATE POLICY "Allow service_role full access on providers" 
        ON public.providers 
        FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'providers' AND policyname = 'Allow authenticated read on providers'
    ) THEN
        CREATE POLICY "Allow authenticated read on providers" 
        ON public.providers 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Composite Partial Index for active eligible providers
CREATE INDEX IF NOT EXISTS idx_providers_execution_eligible 
ON public.providers (code) 
WHERE is_enabled = true AND is_execution_enabled = true AND is_maintenance = false;

-- Seed Providers
INSERT INTO public.providers (
    code,
    name,
    description,
    is_enabled,
    is_catalog_enabled,
    is_execution_enabled,
    is_maintenance,
    balance,
    health_status
) VALUES 
(
    'DIGIFLAZZ',
    'Digiflazz',
    'Primary PPOB & Game aggregator provider',
    true,
    true,
    true,
    false,
    COALESCE((SELECT balance_digiflazz FROM public.store_settings LIMIT 1), 0),
    'HEALTHY'
),
(
    'APIGAMES',
    'APIGames',
    'Game voucher and direct top-up engine',
    false,
    false,
    false,
    false,
    0,
    'UNKNOWN'
),
(
    'UNIPLAY',
    'Uniplay',
    'Game voucher distribution provider',
    false,
    false,
    false,
    false,
    0,
    'UNKNOWN'
),
(
    'VIP_RESELLER',
    'VIP Reseller',
    'Multi-category digital goods & PPOB provider',
    false,
    false,
    false,
    false,
    0,
    'UNKNOWN'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

