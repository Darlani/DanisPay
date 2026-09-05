-- ============================================================================
-- MIGRATION: P.2 CANONICAL PRODUCT MAPPING
-- DESCRIPTION: Add product_automatic_id foreign key to items, create composite
--              index, and execute deterministic 3-tier backfill with strict
--              precondition ambiguity assertions.
-- ============================================================================

BEGIN;

-- 1. Precondition Check: Item count & Zero Ambiguity Assertion
DO $$
DECLARE
  v_total_items int;
  v_tier1_ambiguous int;
  v_tier2_ambiguous int;
  v_cross_ambiguous int;
  v_dana_item_count int;
  v_dana_prod_count int;
BEGIN
  SELECT COUNT(*) INTO v_total_items FROM public.items;
  IF v_total_items <> 3282 THEN
    RAISE EXCEPTION 'Precondition Failed: items count is %, expected 3282.', v_total_items;
  END IF;

  -- 1. Tier 1 Ambiguity Check (Item matching >1 product in Tier 1)
  SELECT COUNT(*) INTO v_tier1_ambiguous
  FROM (
    SELECT i.id
    FROM public.items i
    JOIN public.brands b ON i.brand_slug = b.slug
    JOIN public.product_automatic p ON p.brand_id = b.id AND LOWER(TRIM(i.name)) = LOWER(TRIM(p.name))
    GROUP BY i.id
    HAVING COUNT(DISTINCT p.id) > 1
  ) t1;

  IF v_tier1_ambiguous > 0 THEN
    RAISE EXCEPTION 'Precondition Failed: % items have ambiguous Tier 1 matches.', v_tier1_ambiguous;
  END IF;

  -- 2. Tier 2 Ambiguity Check (Item matching >1 product in Tier 2)
  SELECT COUNT(*) INTO v_tier2_ambiguous
  FROM (
    SELECT i.id
    FROM public.items i
    JOIN public.brands b ON i.brand_slug = b.slug
    JOIN public.product_automatic p ON p.brand_id = b.id AND LOWER(TRIM(p.name)) = '[zonasi] ' || LOWER(TRIM(i.name))
    GROUP BY i.id
    HAVING COUNT(DISTINCT p.id) > 1
  ) t2;

  IF v_tier2_ambiguous > 0 THEN
    RAISE EXCEPTION 'Precondition Failed: % items have ambiguous Tier 2 matches.', v_tier2_ambiguous;
  END IF;

  -- 3. Cross-Tier Ambiguity Check (Item matching both Tier 1 and Tier 2 products)
  SELECT COUNT(*) INTO v_cross_ambiguous
  FROM (
    SELECT i.id
    FROM public.items i
    JOIN public.brands b ON i.brand_slug = b.slug
    JOIN public.product_automatic p1 ON p1.brand_id = b.id AND LOWER(TRIM(i.name)) = LOWER(TRIM(p1.name))
    JOIN public.product_automatic p2 ON p2.brand_id = b.id AND LOWER(TRIM(p2.name)) = '[zonasi] ' || LOWER(TRIM(i.name))
    WHERE p1.id <> p2.id
    GROUP BY i.id
  ) tc;

  IF v_cross_ambiguous > 0 THEN
    RAISE EXCEPTION 'Precondition Failed: % items match both Tier 1 and Tier 2 products.', v_cross_ambiguous;
  END IF;

  -- 4. Tier 3 DANA Isolation Check
  SELECT COUNT(*) INTO v_dana_item_count FROM public.items WHERE sku = 'dana50';
  SELECT COUNT(*) INTO v_dana_prod_count FROM public.product_automatic WHERE sku = 'dana50';

  IF v_dana_item_count <> 1 OR v_dana_prod_count <> 1 THEN
    RAISE EXCEPTION 'Precondition Failed: DANA 50.000 exception is not exactly 1:1 (items: %, prods: %).', v_dana_item_count, v_dana_prod_count;
  END IF;
END $$;

-- 2. Tambah kolom product_automatic_id pada public.items dengan FK ON DELETE SET NULL
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS product_automatic_id uuid NULL 
REFERENCES public.product_automatic(id) 
ON DELETE SET NULL;

-- 3. Tambah composite partial index untuk checkout cepat
CREATE INDEX IF NOT EXISTS idx_items_product_automatic_id_modal 
ON public.items (product_automatic_id, modal ASC) 
WHERE is_active = true AND product_automatic_id IS NOT NULL;

-- 4. DETERMINISTIC 3-TIER BACKFILL
-- Tier 1: Exact Brand Slug + Exact Name Matching (3.146 amunisi)
UPDATE public.items i
SET product_automatic_id = p.id
FROM public.product_automatic p
JOIN public.brands b ON p.brand_id = b.id
WHERE i.product_automatic_id IS NULL
  AND i.brand_slug = b.slug
  AND LOWER(TRIM(i.name)) = LOWER(TRIM(p.name));

-- Tier 2: Exact Brand Slug + [ZONASI] Transformed Name (135 amunisi)
UPDATE public.items i
SET product_automatic_id = p.id
FROM public.product_automatic p
JOIN public.brands b ON p.brand_id = b.id
WHERE i.product_automatic_id IS NULL
  AND i.brand_slug = b.slug
  AND LOWER(TRIM(p.name)) = '[zonasi] ' || LOWER(TRIM(i.name));

-- Tier 3: Exact SKU Exception Khusus Anomali Historis DANA 50.000 (1 amunisi)
UPDATE public.items i
SET product_automatic_id = p.id
FROM public.product_automatic p
WHERE i.product_automatic_id IS NULL
  AND i.sku = 'dana50'
  AND p.sku = 'dana50';

-- 5. Postcondition Assertions: Verifikasi 100% amunisi terpetakan tanpa cela
DO $$
DECLARE
  v_mapped_count int;
  v_unmapped_count int;
BEGIN
  SELECT COUNT(*) INTO v_mapped_count 
  FROM public.items 
  WHERE product_automatic_id IS NOT NULL;

  IF v_mapped_count <> 3282 THEN
    RAISE EXCEPTION 'Postcondition Failed: Mapped items count is %, expected 3282.', v_mapped_count;
  END IF;

  SELECT COUNT(*) INTO v_unmapped_count 
  FROM public.items 
  WHERE product_automatic_id IS NULL;

  IF v_unmapped_count > 0 THEN
    RAISE EXCEPTION 'Postcondition Failed: % items remain unmapped.', v_unmapped_count;
  END IF;
END $$;

COMMIT;
