-- ============================================================================
-- Rush OS — Inventory Count (physical stock count + variance review)
--
-- A worker performs a physical stock count and submits ONE session
-- (inventory_counts) with many lines (inventory_count_items), one per item
-- counted. Counting is "blind": the worker enters what they physically count
-- without seeing the system's expected on-hand. We snapshot the expected
-- quantity at submission time so the owner can review the variance later.
--
-- On approval the owner reconciles each item: stock_base_qty is SET to the
-- counted amount and revalued at the item's current weighted-average unit cost
-- (the physical count is the source of truth). The per-line value_fils records
-- the value change: positive for an overage (stock gained), negative for a
-- shortage (shrinkage loss). Rejecting voids the session with no stock change.
--
-- All quantities are in the item's BASE unit (same canonical unit as recipes
-- and inventory_items.stock_base_qty). value_fils is filled in at approval
-- because cost is owner-only and the weighted average can change over time.
--
-- Mirrors the worker-submit -> owner-review pattern of waste_logs, extended to
-- a parent/child (session/lines) shape. Reuses review_status + is_owner().
-- ============================================================================

-- ---------- Session header --------------------------------------------------

CREATE TABLE inventory_counts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes       text,
  counted_at  timestamptz NOT NULL DEFAULT now(),
  status      review_status NOT NULL DEFAULT 'needs_review',
  created_by  uuid REFERENCES auth.users (id),
  reviewed_by uuid REFERENCES auth.users (id),
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_counts_status_idx ON inventory_counts (status);
CREATE INDEX inventory_counts_created_by_idx ON inventory_counts (created_by);

CREATE TRIGGER inventory_counts_updated_at BEFORE UPDATE ON inventory_counts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Count lines -----------------------------------------------------

CREATE TABLE inventory_count_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id          uuid NOT NULL REFERENCES inventory_counts (id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items (id) ON DELETE RESTRICT,
  expected_base_qty numeric NOT NULL DEFAULT 0,            -- system on-hand snapshot at submission
  counted_base_qty  numeric NOT NULL CHECK (counted_base_qty >= 0), -- what was physically counted
  variance_base_qty numeric NOT NULL DEFAULT 0,            -- counted - expected (signed)
  value_fils        bigint  NOT NULL DEFAULT 0,            -- value change, set on approval (signed)
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_count_items_count_idx ON inventory_count_items (count_id);
CREATE INDEX inventory_count_items_item_idx ON inventory_count_items (inventory_item_id);

-- ---------- RLS (mirrors waste_logs) ----------------------------------------

ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;

-- Owner: full access to both tables.
CREATE POLICY inventory_counts_owner_all ON inventory_counts
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY inventory_count_items_owner_all ON inventory_count_items
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- Workers can open their own sessions, only as needs_review.
CREATE POLICY inventory_counts_worker_insert ON inventory_counts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

-- Workers can read their own sessions.
CREATE POLICY inventory_counts_worker_select ON inventory_counts
  FOR SELECT USING (created_by = auth.uid());

-- Workers can delete their own sessions while still pending (cascade clears lines).
CREATE POLICY inventory_counts_worker_delete ON inventory_counts
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'needs_review'
  );

-- Workers can add lines to their own pending sessions.
CREATE POLICY inventory_count_items_worker_insert ON inventory_count_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_counts c
      WHERE c.id = count_id
        AND c.created_by = auth.uid()
        AND c.status = 'needs_review'
    )
  );

-- Workers can read lines belonging to their own sessions.
CREATE POLICY inventory_count_items_worker_select ON inventory_count_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventory_counts c
      WHERE c.id = count_id
        AND c.created_by = auth.uid()
    )
  );
