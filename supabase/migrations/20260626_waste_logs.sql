-- ============================================================================
-- Rush OS — Phase A: Record Waste
--
-- Workers log spoiled / damaged / expired stock. Each entry goes to owner
-- review (mirrors complimentary_logs). On approval the owner consumes the
-- wasted quantity from inventory at weighted-average cost, and the consumed
-- value is stored here as value_fils (the loss/COGS for that waste).
--
-- base_qty is in the item's BASE unit (same canonical unit as recipes and
-- inventory_items.stock_base_qty). value_fils is filled in at approval time
-- because cost is owner-only and the weighted average can change over time.
-- ============================================================================

CREATE TABLE waste_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items (id) ON DELETE RESTRICT,
  base_qty          numeric NOT NULL CHECK (base_qty > 0),   -- amount wasted, in base units
  value_fils        bigint  NOT NULL DEFAULT 0 CHECK (value_fils >= 0), -- loss value, set on approval
  reason            text NOT NULL,
  notes             text,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  status            review_status NOT NULL DEFAULT 'needs_review',
  created_by        uuid REFERENCES auth.users (id),
  reviewed_by       uuid REFERENCES auth.users (id),
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX waste_logs_item_idx ON waste_logs (inventory_item_id);
CREATE INDEX waste_logs_status_idx ON waste_logs (status);

CREATE TRIGGER waste_logs_updated_at BEFORE UPDATE ON waste_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS (mirrors complimentary_logs) --------------------------------

ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

-- Owner: full access.
CREATE POLICY waste_logs_owner_all ON waste_logs
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- Workers can insert their own entries, only as needs_review.
CREATE POLICY waste_logs_worker_insert ON waste_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

-- Workers can read their own entries.
CREATE POLICY waste_logs_worker_select ON waste_logs
  FOR SELECT USING (created_by = auth.uid());

-- Workers can delete their own entries while still pending.
CREATE POLICY waste_logs_worker_delete ON waste_logs
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'needs_review'
  );
