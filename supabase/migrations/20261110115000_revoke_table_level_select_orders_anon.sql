-- Migration: 20261110115000_revoke_table_level_select_orders_anon.sql
-- Description: Revoke table-level SELECT from anon on orders, granting strictly column-level SELECT on safe invoice columns

-- 1. Revoke broad table-level SELECT from anon
REVOKE SELECT ON public.orders FROM anon;

-- 2. Explicitly grant SELECT only on safe public invoice status columns
GRANT SELECT (id, order_id, status, sn, notes, updated_at) ON public.orders TO anon;
