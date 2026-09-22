-- ============================================================================
-- MIGRATION: RENAME items -> product_providers_items
--            AND unified_products_view -> product_unified_view
-- DESCRIPTION: Rename table public.items to public.product_providers_items,
--              rename constraints/indexes/sequence, create product_unified_view,
--              update potential profit RPC, and provide backward-compatible aliases.
-- ============================================================================

BEGIN;

-- 1. Rename table public.items to public.product_providers_items
ALTER TABLE IF EXISTS public.items RENAME TO product_providers_items;

-- 2. Rename sequence if exists
ALTER SEQUENCE IF EXISTS public.items_id_seq RENAME TO product_providers_items_id_seq;

-- 3. Rename constraints on product_providers_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'items_pkey' AND conrelid = 'public.product_providers_items'::regclass
  ) THEN
    ALTER TABLE public.product_providers_items RENAME CONSTRAINT items_pkey TO product_providers_items_pkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'items_provider_sku_key' AND conrelid = 'public.product_providers_items'::regclass
  ) THEN
    ALTER TABLE public.product_providers_items RENAME CONSTRAINT items_provider_sku_key TO product_providers_items_provider_sku_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'items_provider_format_check' AND conrelid = 'public.product_providers_items'::regclass
  ) THEN
    ALTER TABLE public.product_providers_items RENAME CONSTRAINT items_provider_format_check TO product_providers_items_provider_format_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'items_product_automatic_id_fkey' AND conrelid = 'public.product_providers_items'::regclass
  ) THEN
    ALTER TABLE public.product_providers_items RENAME CONSTRAINT items_product_automatic_id_fkey TO product_providers_items_product_automatic_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'items_brand_slug_fkey' AND conrelid = 'public.product_providers_items'::regclass
  ) THEN
    ALTER TABLE public.product_providers_items RENAME CONSTRAINT items_brand_slug_fkey TO product_providers_items_brand_slug_fkey;
  END IF;
END $$;

-- 4. Rename indexes on product_providers_items
ALTER INDEX IF EXISTS public.items_brand_slug_idx RENAME TO product_providers_items_brand_slug_idx;
ALTER INDEX IF EXISTS public.idx_items_product_automatic_id_modal RENAME TO idx_product_providers_items_product_automatic_id_modal;

-- 5. Create new view public.product_unified_view
CREATE OR REPLACE VIEW public.product_unified_view
WITH (security_invoker = true) AS

SELECT
    p.id::text AS id,
    'product_automatic'::text AS source_table,
    p.sku,
    p.name,
    p.category_id,
    p.brand_id,
    p.cost,
    p.price,
    p.stock,
    p.is_active,
    p.margin_item,
    p.lock_margin,
    p.discount,
    p.cashback,
    p.promo_label,
    p.provider,
    p.sub_brand,
    p.updated_at,
    c.name AS category_name,
    b.name AS brand_name
FROM product_automatic p
LEFT JOIN categories c
    ON p.category_id = c.id
LEFT JOIN brands b
    ON p.brand_id = b.id

UNION ALL

SELECT
    s.id::text AS id,
    'product_semi_auto'::text AS source_table,
    s.sku,
    s.name,
    s.category_id,
    s.brand_id,
    s.cost_numeric AS cost,
    s.price_numeric AS price,
    s.stock,
    s.is_active,
    s.margin_item,
    s.lock_margin,
    s.discount,
    s.cashback,
    s.promo_label,
    s.provider,
    s.sub_brand,
    s.updated_at,
    c.name AS category_name,
    b.name AS brand_name
FROM product_semi_auto s
LEFT JOIN categories c
    ON s.category_id = c.id
LEFT JOIN brands b
    ON s.brand_id = b.id;

-- 6. Update RPC public.get_products_potential_profit to query public.product_unified_view
CREATE OR REPLACE FUNCTION public.get_products_potential_profit(
    p_search text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_global_cashback numeric DEFAULT 3.0
)
RETURNS TABLE (
    total_modal numeric,
    total_omzet numeric,
    total_profit numeric,
    total_items bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_search text;
    v_pattern text;
    v_is_stok_kritis boolean;
    v_has_search boolean;
BEGIN
    v_has_search := (p_search IS NOT NULL AND TRIM(p_search) <> '');
    v_is_stok_kritis := (v_has_search AND LOWER(TRIM(p_search)) = 'stok:kritis');
    
    IF v_has_search AND NOT v_is_stok_kritis THEN
        v_clean_search := REGEXP_REPLACE(p_search, '[^a-zA-Z0-9 ]', '', 'g');
        v_pattern := '%' || v_clean_search || '%';
    ELSE
        v_pattern := NULL;
    END IF;

    RETURN QUERY
    WITH filtered_items AS (
        SELECT
            GREATEST(0, COALESCE(stock, 0)) AS v_stock,
            GREATEST(0, COALESCE(cost, 0)) AS v_cost,
            GREATEST(0, COALESCE(price, 0)) AS v_price,
            GREATEST(0, COALESCE(discount, 0)) AS v_discount
        FROM public.product_unified_view
        WHERE (p_category_id IS NULL OR category_id = p_category_id)
          AND (
            NOT v_has_search
            OR (v_is_stok_kritis AND stock <= 5)
            OR (
                NOT v_is_stok_kritis AND (
                    name ILIKE v_pattern
                    OR sku ILIKE v_pattern
                    OR category_name ILIKE v_pattern
                    OR brand_name ILIKE v_pattern
                    OR provider ILIKE v_pattern
                    OR sub_brand ILIKE v_pattern
                )
            )
          )
    ),
    calculated_items AS (
        SELECT
            v_stock,
            v_cost,
            (v_price - FLOOR(v_price * (v_discount / 100.0))) AS v_eff_price,
            (v_cost * v_stock) AS v_modal
        FROM filtered_items
    ),
    profit_items AS (
        SELECT
            v_stock,
            v_cost,
            v_eff_price,
            v_modal,
            (v_eff_price * v_stock) AS v_omzet,
            (v_eff_price - v_cost) AS v_gross_profit,
            CASE 
                WHEN (v_eff_price - v_cost) <= 0 THEN 0
                ELSE LEAST(
                    FLOOR(v_eff_price * (COALESCE(p_global_cashback, 3.0) / 100.0)),
                    FLOOR((v_eff_price - v_cost) * (COALESCE(p_global_cashback, 3.0) / 100.0))
                )
            END AS v_cb_per_item
        FROM calculated_items
    )
    SELECT
        COALESCE(SUM(v_modal), 0)::numeric AS total_modal,
        COALESCE(SUM(v_omzet), 0)::numeric AS total_omzet,
        COALESCE(SUM((v_eff_price - v_cost - v_cb_per_item) * v_stock), 0)::numeric AS total_profit,
        COUNT(*)::bigint AS total_items
    FROM profit_items;
END;
$$;

REVOKE ALL ON FUNCTION public.get_products_potential_profit(text, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_products_potential_profit(text, uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.get_products_potential_profit(text, uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_products_potential_profit(text, uuid, numeric) TO service_role;

-- 7. Zero-Downtime Backward-Compatible Views:
-- Point old public.items to public.product_providers_items
CREATE OR REPLACE VIEW public.items AS
SELECT * FROM public.product_providers_items;

-- Point old public.unified_products_view to public.product_unified_view
CREATE OR REPLACE VIEW public.unified_products_view
WITH (security_invoker = true) AS
SELECT * FROM public.product_unified_view;

-- 8. Permissions and Grants
GRANT ALL ON TABLE public.product_providers_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.items TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.product_unified_view TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.unified_products_view TO anon, authenticated, service_role;

COMMIT;
