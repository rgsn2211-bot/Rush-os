-- ============================================================================
-- Rush OS — Money accounts (register vs bank)
--
-- The owner holds money in two places: the cash register and the bank account.
-- Every cash movement now belongs to an account so we can report:
--   * register balance, * bank balance, * total money (register + bank).
--
-- source_type / source_id let other features post movements idempotently and
-- reverse them later (e.g. EOD approval posts a register cash-in tagged with the
-- closing id; voiding the closing deletes exactly that movement).
-- ============================================================================

ALTER TABLE cash_movements
  ADD COLUMN account text NOT NULL DEFAULT 'register'
    CHECK (account IN ('register', 'bank')),
  ADD COLUMN source_type text,
  ADD COLUMN source_id   uuid;

-- Existing rows are register cash by default (the column default backfills them).

CREATE INDEX cash_movements_account_idx ON cash_movements (account);
CREATE INDEX cash_movements_source_idx ON cash_movements (source_type, source_id);
