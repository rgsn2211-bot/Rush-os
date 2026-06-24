-- ============================================================================
-- Rush OS — Money module, part 2: Settlements (Cash Flow)
--
-- Money owed to the shop by payment providers that isn't in the bank yet:
--   * card        — settles with a short delay, processing fee deducted
--   * benefitpay  — settles to the bank, typically no fee
--   * delivery    — settles (usually monthly) per platform, commission + fees
--                   deducted before payout
--
-- The owner records an expected settlement, then confirms it when received
-- (actual amount + fee + date). This is a reconciliation ledger; cash position
-- is still driven by the Cash Log. Owner-only.
-- ============================================================================

CREATE TABLE settlements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel      text NOT NULL CHECK (channel IN ('card', 'benefitpay', 'delivery')),
  -- Platform name for delivery apps (e.g. "Talabat"); null for card/benefitpay.
  platform     text,
  period_label text NOT NULL,
  expected_fils bigint NOT NULL CHECK (expected_fils >= 0),
  fee_fils     bigint CHECK (fee_fils IS NULL OR fee_fils >= 0),
  actual_fils  bigint CHECK (actual_fils IS NULL OR actual_fils >= 0),
  received_on  date,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  note         text,
  created_by   uuid REFERENCES auth.users (id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settlements_channel_status_idx ON settlements (channel, status);

CREATE TRIGGER settlements_updated_at BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY settlements_owner_all ON settlements
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
