-- ============================================================================
-- Rush OS — Per-item exclusion on approved counts
--
-- Every correction to an approved count applied to the WHOLE session: rewrite
-- all lines (editCount), remove the record keeping stock, or void and revert
-- stock. One miscounted item could not be dealt with on its own, so fixing it
-- meant discarding every other line's correct reconciliation.
--
-- The case that prompted this: a count "finds" stock, which books a GAIN — but
-- that stock was paid for in an earlier period, so the gain is fake. The owner
-- wants the stock (they really do have the goods) without the phantom gain
-- polluting the loss report, and wants to leave the rest of the count alone.
--
-- Excluding a line deletes its usage-ledger rows, so every report — Losses,
-- Profit, the usage mix — stops seeing it automatically. The LINE itself is
-- kept and marked: this is a money system, so an override should stay legible
-- and be reversible rather than vanishing.
--
-- excluded_kept_stock records which of the two the owner chose, because the
-- distinction matters later: a line excluded with the stock KEPT has no ledger
-- rows left, so a subsequent whole-count "void & revert stock" will not undo
-- its stock change. That is intended — they asked to keep it.
-- ============================================================================

ALTER TABLE inventory_count_items
  ADD COLUMN excluded_at         timestamptz,
  ADD COLUMN excluded_by         uuid REFERENCES auth.users (id),
  -- true  = the line's stock adjustment was KEPT when it was excluded
  -- false = the stock was reverted too
  ADD COLUMN excluded_kept_stock boolean;

-- Reports filter excluded lines out of their totals.
CREATE INDEX inventory_count_items_excluded_idx
  ON inventory_count_items (count_id, excluded_at);

-- No RLS change: inventory_count_items keeps its existing owner/worker
-- policies, and these columns carry no cost data.
