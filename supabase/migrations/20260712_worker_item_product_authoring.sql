-- ============================================================================
-- Rush OS — Worker authoring of inventory items & products
--
-- The owner is handing inventory data-entry to a worker. A worker may now CREATE
-- (and edit/delete while still pending) inventory items and products, and both are
-- IMMEDIATELY usable — no waiting for approval. The owner is notified in-app (the
-- existing "Pending reviews" count + Review Center) and approves/rejects afterward.
--
-- Hard rule (CLAUDE.md): workers never see financial data. So:
--   * Workers write inventory items through the app WITHOUT any cost fields
--     (default_cost_fils / costing_method keep their DB defaults until the owner
--     sets the real cost on approval).
--   * There is deliberately NO worker SELECT policy on the inventory_items base
--     table — workers read the cost-free `inventory_items_worker` view instead, so
--     the cost columns can never leak. Worker inserts/updates therefore run with
--     "return=minimal" (no RETURNING) in the repository layer.
--   * recipe_ingredients holds only qty_base (no cost), so workers may read their
--     own product recipes.
--
-- Mirrors the worker-submission RLS template from purchases / inventory_counts:
--   INSERT  : auth.uid() IS NOT NULL AND status = 'needs_review' AND created_by = auth.uid()
--   UPDATE  : created_by = auth.uid() AND status = 'needs_review'  (USING + WITH CHECK)
--   DELETE  : created_by = auth.uid() AND status = 'needs_review'
-- ============================================================================

-- ---------- Products: join the review workflow ------------------------------
-- Products predate the worker-submission pattern, so they lack the audit quartet.

ALTER TABLE products
  ADD COLUMN status      review_status NOT NULL DEFAULT 'approved',
  ADD COLUMN created_by  uuid REFERENCES auth.users (id),
  ADD COLUMN reviewed_by uuid REFERENCES auth.users (id),
  ADD COLUMN reviewed_at timestamptz;

CREATE INDEX products_status_idx ON products (status);

-- ---------- Inventory items: audit trail on approval ------------------------
-- (status + created_by already exist from the core migration.)

ALTER TABLE inventory_items
  ADD COLUMN reviewed_by uuid REFERENCES auth.users (id),
  ADD COLUMN reviewed_at timestamptz;

-- Expose created_by on the cost-free worker view so a worker can list their OWN
-- submissions (and the UI can show edit/delete on their pending ones). created_by
-- is not financial data. Column is appended at the end to keep CREATE OR REPLACE valid.
CREATE OR REPLACE VIEW inventory_items_worker
WITH (security_invoker = false) AS
  SELECT id, name, category, base_unit, stock_unit, base_per_stock,
         purchase_unit, units_per_purchase, expiry, tracks_open,
         shelf_life_days, open_life_days, min_base_qty, max_base_qty,
         safety_days, supplier_id, stock_base_qty, status, created_at,
         created_by
  FROM inventory_items
  WHERE status != 'voided';

GRANT SELECT ON inventory_items_worker TO authenticated;

-- ---------- Worker RLS: inventory_items -------------------------------------
-- Owner-all already exists (inventory_items_owner_all). No worker SELECT on the
-- base table by design (cost hiding) — see header note.

CREATE POLICY inventory_items_worker_insert ON inventory_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

CREATE POLICY inventory_items_worker_update ON inventory_items
  FOR UPDATE USING (
    created_by = auth.uid() AND status = 'needs_review'
  ) WITH CHECK (
    created_by = auth.uid() AND status = 'needs_review'
  );

CREATE POLICY inventory_items_worker_delete ON inventory_items
  FOR DELETE USING (
    created_by = auth.uid() AND status = 'needs_review'
  );

-- ---------- Worker RLS: products --------------------------------------------
-- Owner-all (products_owner_all) and worker SELECT (products_worker_select
-- USING(true)) already exist. Price is not sensitive, so worker SELECT is fine.

CREATE POLICY products_worker_insert ON products
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

CREATE POLICY products_worker_update ON products
  FOR UPDATE USING (
    created_by = auth.uid() AND status = 'needs_review'
  ) WITH CHECK (
    created_by = auth.uid() AND status = 'needs_review'
  );

CREATE POLICY products_worker_delete ON products
  FOR DELETE USING (
    created_by = auth.uid() AND status = 'needs_review'
  );

-- ---------- Worker RLS: recipe_ingredients ----------------------------------
-- The table has no created_by, so scope through the parent product. Workers may
-- read their own product recipes (no cost stored here) and write recipe rows only
-- while the parent product is still their own pending submission.

CREATE POLICY recipe_ingredients_worker_select ON recipe_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = recipe_ingredients.product_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY recipe_ingredients_worker_insert ON recipe_ingredients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = recipe_ingredients.product_id
        AND p.created_by = auth.uid()
        AND p.status = 'needs_review'
    )
  );

CREATE POLICY recipe_ingredients_worker_delete ON recipe_ingredients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = recipe_ingredients.product_id
        AND p.created_by = auth.uid()
        AND p.status = 'needs_review'
    )
  );
