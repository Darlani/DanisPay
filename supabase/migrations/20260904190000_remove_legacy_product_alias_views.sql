-- Remove obsolete compatibility aliases.
-- The canonical production objects are:
--   public.product_providers_items
--   public.product_unified_view
--
-- No underlying data/table/view is removed.

DROP VIEW IF EXISTS public.items;
DROP VIEW IF EXISTS public.unified_products_view;

