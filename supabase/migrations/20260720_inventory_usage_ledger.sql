-- ============================================================================
-- Rush OS — Inventory usage ledger + negative stock support
--
-- 1) inventory_usage: a per-event ledger of every stock consumption that
--    produces COGS (POS sale deductions, waste, count variances). Until now
--    the only record was pos_imports.deduction_details jsonb, aggregated by
--    inventory item — the product dimension was lost, so COGS could never be
--    reported per product or per product group (Menu, Staff, Training, ...).
--    Ledger rows preserve that dimension and power the Profit/COGS reports.
--
-- 2) inventory_items.last_unit_cost_fils: fallback unit cost used when stock
--    is consumed past zero. Stock is now allowed to go NEGATIVE: POS sales and
--    waste already happened in the real world, so when the system's on-hand is
--    behind (e.g. a purchase wasn't entered yet) the deduction proceeds and the
--    shortfall is costed at this fallback instead of being silently dropped.
--
-- 3) waste_logs.consumed_base_qty: what was actually consumed at approval,
--    recorded so an approved waste can later be voided with an exact reversal.
--
-- 4) Backfill: item-level usage history is rebuilt from the deduction_details
--    of already-processed imports (product_id stays NULL for those — per-product
--    history starts from this migration forward).
-- ============================================================================

CREATE TABLE inventory_usage (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The business date of the consumption (POS report date; today for waste/counts).
  occurred_on        date NOT NULL,
  source_type        text NOT NULL CHECK (source_type IN ('pos_import', 'waste', 'count')),
  source_id          uuid NOT NULL,
  inventory_item_id  uuid NOT NULL REFERENCES inventory_items (id) ON DELETE RESTRICT,
  -- The product that drove the consumption (POS deductions only; null for
  -- waste, counts, and rows backfilled from before per-product tracking).
  product_id         uuid REFERENCES products (id) ON DELETE SET NULL,
  product_group_id   uuid REFERENCES product_groups (id) ON DELETE SET NULL,
  -- Snapshot of the group name at deduction time, so reports stay truthful
  -- even if the owner later renames or deletes the group.
  product_group_name text,
  -- Positive = consumed (COGS); negative = restored (count overage).
  qty_base           numeric NOT NULL,
  cogs_fils          bigint  NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_usage_date_idx    ON inventory_usage (occurred_on);
CREATE INDEX inventory_usage_source_idx  ON inventory_usage (source_type, source_id);
CREATE INDEX inventory_usage_item_idx    ON inventory_usage (inventory_item_id);
CREATE INDEX inventory_usage_product_idx ON inventory_usage (product_id);

ALTER TABLE inventory_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_usage_owner_all ON inventory_usage
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- The POS Manager processes imports (which write ledger rows) and may see cost
-- data — but never money/profit pages. Workers get NO policy: cost is owner data.
CREATE POLICY inventory_usage_pos_manager_all ON inventory_usage
  FOR ALL USING (is_pos_manager()) WITH CHECK (is_pos_manager());

-- Fallback unit cost (fils per base unit) for costing consumption past zero.
-- numeric, not bigint: it is a unit cost and may be fractional fils; line
-- totals derived from it are always rounded to integer fils.
ALTER TABLE inventory_items
  ADD COLUMN last_unit_cost_fils numeric NOT NULL DEFAULT 0
    CHECK (last_unit_cost_fils >= 0);

UPDATE inventory_items
SET last_unit_cost_fils = CASE
  WHEN stock_base_qty > 0 THEN stock_value_fils::numeric / stock_base_qty
  ELSE default_cost_fils
END;

-- What an approved waste actually consumed (base units), for exact void/reversal.
-- Null on rows approved before this migration.
ALTER TABLE waste_logs
  ADD COLUMN consumed_base_qty numeric;

-- Backfill item-level POS usage history from deduction_details so total-COGS
-- and consumption-rate reports work from day one.
INSERT INTO inventory_usage
  (occurred_on, source_type, source_id, inventory_item_id, qty_base, cogs_fils)
SELECT
  i.report_date,
  'pos_import',
  i.id,
  (d ->> 'inventoryItemId')::uuid,
  (d ->> 'baseQtyDeducted')::numeric,
  (d ->> 'cogsFils')::bigint
FROM pos_imports i,
     jsonb_array_elements(i.deduction_details -> 'deductions') d
WHERE i.inventory_deducted
  AND i.status <> 'voided'
  AND EXISTS (
    SELECT 1 FROM inventory_items ii
    WHERE ii.id = (d ->> 'inventoryItemId')::uuid
  );

-- Backfill approved waste. Legacy approvals clamped the consumed quantity to
-- on-hand, so base_qty may slightly overstate what was consumed — value_fils is
-- the actual recorded loss and is what the reports sum.
INSERT INTO inventory_usage
  (occurred_on, source_type, source_id, inventory_item_id, qty_base, cogs_fils)
SELECT (w.occurred_at AT TIME ZONE 'utc')::date, 'waste', w.id,
       w.inventory_item_id, w.base_qty, w.value_fils
FROM waste_logs w
WHERE w.status = 'approved';

-- Backfill approved count variances. Sign convention: shrinkage (negative
-- variance) becomes positive consumed qty / positive cost, overage negative.
INSERT INTO inventory_usage
  (occurred_on, source_type, source_id, inventory_item_id, qty_base, cogs_fils)
SELECT (c.counted_at AT TIME ZONE 'utc')::date, 'count', c.id,
       ci.inventory_item_id, -ci.variance_base_qty, -ci.value_fils
FROM inventory_counts c
JOIN inventory_count_items ci ON ci.count_id = c.id
WHERE c.status = 'approved'
  AND ci.variance_base_qty <> 0;
