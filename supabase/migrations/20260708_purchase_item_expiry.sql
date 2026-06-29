-- ============================================================================
-- Rush OS — Expiry dates on received stock
--
-- When a worker receives an item whose expiry tracking is 'required' or
-- 'optional', they record the expiry date of that delivery on the purchase line.
-- It is stored per purchase_item (the received lot). Expiry alerts read these
-- dates so staff are warned before stock expires.
--
-- Nullable: most lines (not_needed items, or optional with no date) have none.
-- ============================================================================

ALTER TABLE purchase_items
  ADD COLUMN expiry_date date;

CREATE INDEX purchase_items_expiry_idx
  ON purchase_items (expiry_date)
  WHERE expiry_date IS NOT NULL;
