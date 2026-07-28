-- ============================================================================
-- Rush OS — Balance adjustments (book-to-actual reconciliation)
--
-- Recorded entries are sometimes wrong or missing, so the register/bank
-- balance the app computes can drift from reality. The owner counts the real
-- money (e.g. end of month), enters the actual amount, and the app posts the
-- difference as a cash movement (source_type 'balance_adjustment') so the
-- account matches reality. Every check is logged here — including zero-diff
-- "verified correct" checks — so drift over time is reportable.
--
-- The linked cash movement defaults to affects_pl = true (a shortage is a real
-- loss, an overage a real gain); the owner can opt a known non-P&L cause out.
-- ============================================================================

CREATE TABLE balance_adjustments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account       text NOT NULL CHECK (account IN ('register', 'bank')),
  -- What the app computed at confirm time.
  expected_fils bigint NOT NULL,
  -- What the owner actually counted.
  actual_fils   bigint NOT NULL CHECK (actual_fils >= 0),
  -- actual - expected (signed; negative = money missing).
  diff_fils     bigint NOT NULL,
  note          text,
  occurred_on   date NOT NULL DEFAULT current_date,
  created_by    uuid REFERENCES auth.users (id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX balance_adjustments_account_idx
  ON balance_adjustments (account, occurred_on);

ALTER TABLE balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY balance_adjustments_owner_all ON balance_adjustments
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
