-- ============================================================================
-- Rush OS — Usage classification (real losses vs legitimate consumption)
--
-- Every ledger row was treated as either COGS (POS) or a loss (waste, count
-- variance). Reality is messier: napkins, cups and cleaning supplies are not
-- in any product recipe, so the POS never deducts them and their entirely
-- legitimate consumption surfaces as "count shrinkage". Likewise a drink that
-- really was sold but whose POS button was never mapped shows up as a loss.
-- Both inflate the loss numbers and hide the true waste rate.
--
-- usage_class separates HOW the stock left from WHY:
--   sold      POS deduction — a normal sale
--   used      legitimate internal/operational consumption (napkins, testing)
--   wasted    spoiled, broken, expired
--   shrinkage unexplained stock missing at count
--   overage   stock FOUND at count (negative cost — not consumption)
--
-- The owner reclassifies wasted/shrinkage rows to used/sold from the Losses
-- drill-down. That is a REPORTING move only: the stock really was consumed, so
-- reclassifying never touches inventory, never changes occurred_on, and never
-- changes net profit — it only moves value between the "loss" and "operational
-- usage" buckets and feeds the used-vs-wasted percentages.
--
-- A partial reclassification splits a row in two; the child points at its
-- parent via reclassified_from_id so the split can be merged back on revert.
-- ============================================================================

ALTER TABLE inventory_usage
  ADD COLUMN usage_class text NOT NULL DEFAULT 'sold'
    CHECK (usage_class IN ('sold', 'used', 'wasted', 'shrinkage', 'overage')),
  -- Set on the row created by a PARTIAL reclassification, pointing at the row
  -- it was split off from.
  ADD COLUMN reclassified_from_id uuid REFERENCES inventory_usage (id) ON DELETE SET NULL,
  ADD COLUMN reclass_note         text,
  ADD COLUMN reclassified_by      uuid REFERENCES auth.users (id),
  ADD COLUMN reclassified_at      timestamptz;

-- Backfill: derive each existing row's class from what produced it. The column
-- default of 'sold' is only correct for POS rows, so waste and counts are set
-- explicitly. A count row with a negative cost is stock found, not lost.
UPDATE inventory_usage SET usage_class = 'sold'      WHERE source_type = 'pos_import';
UPDATE inventory_usage SET usage_class = 'wasted'    WHERE source_type = 'waste';
UPDATE inventory_usage SET usage_class = 'shrinkage' WHERE source_type = 'count' AND cogs_fils >= 0;
UPDATE inventory_usage SET usage_class = 'overage'   WHERE source_type = 'count' AND cogs_fils <  0;

CREATE INDEX inventory_usage_class_idx ON inventory_usage (usage_class, occurred_on);

-- RLS is unchanged: the existing owner + pos_manager policies still apply and
-- there is still no worker policy. Reclassifying is owner-only, enforced by
-- requireOwner on the route and re-checked in the service.
