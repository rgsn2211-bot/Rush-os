-- ============================================================================
-- Phase 2 — Worker auth, RLS policies, and cost-free operational view.
--
-- Workers get individual Supabase Auth accounts (role = 'worker' in profiles).
-- They can receive stock (submit purchases for owner review) and view
-- operational inventory data — but never see financial/cost columns.
-- ============================================================================

-- ---------- Cost-free inventory view for workers ----------------------------
-- SECURITY DEFINER (security_invoker = false) so the view bypasses the
-- owner-only RLS on inventory_items. Workers query this view instead of the
-- base table. It excludes: stock_value_fils, default_cost_fils, costing_method.

CREATE VIEW inventory_items_worker
WITH (security_invoker = false) AS
  SELECT id, name, category, base_unit, stock_unit, base_per_stock,
         purchase_unit, units_per_purchase, expiry, tracks_open,
         shelf_life_days, open_life_days, min_base_qty, max_base_qty,
         safety_days, supplier_id, stock_base_qty, status, created_at
  FROM inventory_items
  WHERE status != 'voided';

GRANT SELECT ON inventory_items_worker TO authenticated;

-- ---------- Worker RLS policies ---------------------------------------------

-- Workers can read suppliers (needed for receive form dropdown).
-- This supplements the existing owner-all policy; owners already have full access.
CREATE POLICY suppliers_worker_select ON suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Workers can INSERT purchases but only with status = 'needs_review'.
-- The created_by must match the calling user so workers can't impersonate.
CREATE POLICY purchases_worker_insert ON purchases
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

-- Workers can read their own purchase submissions.
CREATE POLICY purchases_worker_select_own ON purchases
  FOR SELECT USING (created_by = auth.uid());

-- Workers can INSERT purchase line items (for their purchase submissions).
CREATE POLICY purchase_items_worker_insert ON purchase_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Workers can read purchase_items belonging to their own purchases.
CREATE POLICY purchase_items_worker_select ON purchase_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = purchase_items.purchase_id
        AND purchases.created_by = auth.uid()
    )
  );
