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
        FROM public.unified_products_view
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
                    FLOOR((v_eff_price - v_cost) * (COALESCE(p_global_cashback, 3.0) / 10.0))
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
