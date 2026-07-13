-- ============================================================================
-- Rush OS — POS Manager access + retire worker authoring
--
-- Worker authoring of inventory items & products (20260712) is being replaced by
-- a dedicated pos_manager role. The POS Manager:
--   * creates/edits inventory items INCLUDING the initial cost
--     (default_cost_fils / costing_method) — unlike workers, this role may read
--     and write the inventory_items base table,
--   * creates/edits products and their recipes,
--   * maps POS items to products and manages POS imports.
-- Their creations are trusted: rows keep the DB default status 'approved'
-- (created_by still records who made them) — no owner review queue.
--
-- Access matrix after this migration:
--
--   table               owner  pos_manager  worker
--   inventory_items     all    all          none (cost-free view only)
--   products            all    all          select
--   recipe_ingredients  all    all          none
--   pos_item_catalog    all    all          none
--   pos_imports         all    all          insert own (closing wizard upload)
--   pos_raw_rows        all    all          none
--   pos_sales_rows      all    all          none
--   suppliers           all    select       select
--   product_groups      all    select       select
--   money / EOD / settlements / expenses / profit data: OWNER ONLY — the
--   pos_manager gets NO policies there, so revenue and profit stay invisible.
-- ============================================================================

-- True when the current request is made by a POS Manager. Mirrors is_owner().
-- SECURITY DEFINER so it can read profiles regardless of the caller's own access.
create or replace function is_pos_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'pos_manager'
  );
$$;

-- ---------- Retire the worker-authoring policies (20260712) ------------------
-- These were keyed on auth.uid()/status/created_by, not on role, so ANY
-- authenticated account (including the new pos_manager) would inherit the
-- needs_review-scoped write paths. Worker authoring is removed from the app,
-- so drop them outright.

DROP POLICY IF EXISTS inventory_items_worker_insert ON inventory_items;
DROP POLICY IF EXISTS inventory_items_worker_update ON inventory_items;
DROP POLICY IF EXISTS inventory_items_worker_delete ON inventory_items;
DROP POLICY IF EXISTS products_worker_insert ON products;
DROP POLICY IF EXISTS products_worker_update ON products;
DROP POLICY IF EXISTS products_worker_delete ON products;
DROP POLICY IF EXISTS recipe_ingredients_worker_select ON recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_worker_insert ON recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_worker_delete ON recipe_ingredients;

-- Kept as-is: products_worker_select, suppliers_worker_select,
-- product_groups_worker_select, the purchases/waste/count worker policies, and
-- the cost-free inventory_items_worker view — the worker read-only catalog and
-- the receive/waste/count flows still depend on them.

-- ---------- Data fix: no more needs_review items/products --------------------
-- Nothing creates or reviews needs_review inventory items / products anymore
-- (the Review Center sections are removed). Approve any leftovers so they don't
-- linger un-reviewable; worker-created items have cost 0 and the owner or POS
-- Manager sets the real cost via Edit.

UPDATE inventory_items SET status = 'approved' WHERE status = 'needs_review';
UPDATE products        SET status = 'approved' WHERE status = 'needs_review';

-- ---------- pos_manager policies ---------------------------------------------
-- Full access to exactly the tables its features touch. inventory_items
-- base-table access is intentional: setting initial cost writes
-- default_cost_fils/costing_method, and recipe costing reads
-- stock_value_fils/stock_base_qty for the weighted average.

CREATE POLICY inventory_items_pos_manager_all ON inventory_items
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

CREATE POLICY products_pos_manager_all ON products
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

CREATE POLICY recipe_ingredients_pos_manager_all ON recipe_ingredients
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

CREATE POLICY pos_item_catalog_pos_manager_all ON pos_item_catalog
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

-- Imports tab: upload inserts pos_imports + pos_raw_rows + pos_sales_rows,
-- process updates sales rows and deducts inventory_items stock, void updates
-- the import row.

CREATE POLICY pos_imports_pos_manager_all ON pos_imports
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

CREATE POLICY pos_raw_rows_pos_manager_all ON pos_raw_rows
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

CREATE POLICY pos_sales_rows_pos_manager_all ON pos_sales_rows
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

-- ---------- Provisioning note -------------------------------------------------
-- There is no user-management UI. To create the POS Manager account:
--   1. Create the user in Supabase Auth (email + password) — the
--      handle_new_user trigger gives them a 'worker' profile.
--   2. Promote them:
--        UPDATE profiles SET role = 'pos_manager'
--        WHERE id = (SELECT id FROM auth.users WHERE email = 'pos@example.com');
