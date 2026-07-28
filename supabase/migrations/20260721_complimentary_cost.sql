-- ============================================================================
-- Rush OS — Complimentary cost snapshot
--
-- Complimentary items are already inside POS Sales By Item, so their inventory
-- was (or will be) deducted by the POS import — the log itself must NEVER
-- deduct stock (hard rule: never deduct twice). But the owner wants to see the
-- COST of goods given away, not just the menu value (amount_fils).
--
-- cost_fils snapshots the product's recipe cost at approval time (0 for
-- free-text "Other" entries with no product). In profit reports it is shown as
-- an "of which complimentary" line INSIDE POS COGS — an attribution, never a
-- second subtraction.
-- ============================================================================

ALTER TABLE complimentary_logs
  ADD COLUMN cost_fils bigint NOT NULL DEFAULT 0 CHECK (cost_fils >= 0);
