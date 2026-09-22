CREATE OR REPLACE VIEW public.unified_products_view
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
