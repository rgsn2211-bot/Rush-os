-- ============================================================================
-- Rush OS — allow negative expected drawer cash on daily closings
--
-- cash_expected_fils = opening register cash + today's cash sales − cash that
-- left the register that day. This can legitimately be NEGATIVE — e.g. when the
-- register's opening cash was never recorded as a cash-in movement, or recorded
-- cash-outs (purchases/withdrawals) exceed recorded cash-in. The original
-- CHECK (cash_expected_fils >= 0) therefore rejected valid end-of-day closings
-- with "violates check constraint daily_closings_cash_expected_fils_check",
-- blocking BOTH worker submit and owner back-fill.
--
-- cash_variance_fils already permits negatives (counted − expected); the
-- expected figure must too. Drop the >= 0 constraint. The large variance that
-- results when expected is negative correctly flags the discrepancy for review.
-- ============================================================================

ALTER TABLE daily_closings
  DROP CONSTRAINT IF EXISTS daily_closings_cash_expected_fils_check;
