-- ============================================================================
-- Rush OS — Purchase + Expense payment tracking
--
-- 1. purchases: add paid_method (cash / bank) so we know which money account
--    was debited when a purchase is marked paid.
-- 2. expenses: add account column (register / bank) so we know which account
--    to debit. Derived from the payment method at insert time.
-- ============================================================================

-- ---------- purchases: paid_method -----------------------------------------

ALTER TABLE purchases
  ADD COLUMN paid_method text CHECK (paid_method IN ('cash', 'bank'));

-- ---------- expenses: account ----------------------------------------------

ALTER TABLE expenses
  ADD COLUMN account text NOT NULL DEFAULT 'register'
    CHECK (account IN ('register', 'bank'));

-- Backfill: Cash method → register, everything else → bank.
UPDATE expenses SET account = 'bank' WHERE method <> 'Cash';
