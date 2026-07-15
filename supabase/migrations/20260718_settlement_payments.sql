-- ============================================================================
-- Rush OS — Settlement payments ledger (payouts + commission)
--
-- The card processor / delivery apps pay the shop in lump sums that don't map
-- to specific sales days. Instead of reconciling the auto-created per-day
-- settlements one at a time, the owner now keeps a running total per channel:
--
--   should have  = sum of pending settlements.expected_fils (from configured
--                  commission at EOD) — unchanged, treated as a pooled total
--   received     = sum of recorded payout receipts (amount + date received)
--   commission   = sum of recorded commission entries (amount + date range)
--   still owed    = should have − received − commission
--
-- A "payout" records money that arrived (and posts a bank cash-in). A
-- "commission" records the fee the provider kept (money that never arrives, so
-- no cash movement). Both draw down what's still owed. Card and delivery only;
-- BenefitPay keeps its existing direct-to-bank confirm. Owner-only.
-- ============================================================================

CREATE TABLE settlement_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     text NOT NULL CHECK (channel IN ('card', 'delivery')),
  -- Platform name for delivery apps (e.g. "Talabat"); null for card.
  platform    text,
  kind        text NOT NULL CHECK (kind IN ('payout', 'commission')),
  amount_fils bigint NOT NULL CHECK (amount_fils >= 0),
  -- payout: the date the money was received.
  received_on date,
  -- commission: the date range the fee applies to.
  period_from date,
  period_to   date,
  -- commission: owner-picked label for the fee (e.g. "Processing fee").
  fee_type    text,
  note        text,
  created_by  uuid REFERENCES auth.users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settlement_payments_channel_idx
  ON settlement_payments (channel, platform, kind);

CREATE TRIGGER settlement_payments_updated_at BEFORE UPDATE ON settlement_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE settlement_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY settlement_payments_owner_all ON settlement_payments
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
