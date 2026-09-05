-- Migration: 20260905170000_fix_product_unified_view_security_definer.sql
-- Description: Set security_invoker = false on public.product_unified_view so public storefront can query eligible items without RLS blocking providers table

BEGIN;

CREATE OR REPLACE VIEW public.product_unified_view
WITH (security_invoker = false) AS

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
    b.name AS brand_name,
    (
        -- Multi-provider check: Active mapped item from an enabled & visible provider
        EXISTS (
            SELECT 1 
            FROM public.product_providers_items ppi
            JOIN public.providers prov ON UPPER(ppi.provider) = prov.code
            WHERE ppi.product_automatic_id = p.id
              AND ppi.is_active = true
              AND prov.is_enabled = true
              AND prov.is_storefront_visible = true
        )
        OR
        -- Direct canonical provider check (e.g. DIGIFLAZZ): Provider is enabled & visible
        (
            p.provider IS NOT NULL
            AND EXISTS (
                SELECT 1 
                FROM public.providers prov 
                WHERE prov.code = UPPER(p.provider)
                  AND prov.is_enabled = true
                  AND prov.is_storefront_visible = true
            )
        )
    ) AS is_storefront_eligible
FROM public.product_automatic p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id

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
    b.name AS brand_name,
    (
        s.provider IS NULL 
        OR UPPER(s.provider) = 'MANUAL'
        OR EXISTS (
            SELECT 1 FROM public.providers prov 
            WHERE prov.code = UPPER(s.provider)
              AND prov.is_enabled = true
              AND prov.is_storefront_visible = true
        )
    ) AS is_storefront_eligible
FROM public.product_semi_auto s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN brands b ON s.brand_id = b.id;

-- Grants dan Permissions
GRANT SELECT ON TABLE public.product_unified_view TO anon, authenticated, service_role;

COMMIT;
