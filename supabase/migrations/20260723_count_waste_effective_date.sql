-- ============================================================================
-- Rush OS — Business date for counts and waste
--
-- Counts and waste stamped their usage-ledger rows with the date the OWNER
-- APPROVED them (todayInBahrain()), so a count of July's shelves approved in
-- August booked July's shrinkage into August and both months' reports were
-- wrong. POS imports already do this correctly, dating their ledger rows by
-- the import's report_date.
--
-- effective_on is the business date the loss belongs to. It is independent of
-- when the count was taken and when it was approved: approving still sets
-- stock to the counted quantity right now, but the ledger row — and therefore
-- Profit, Losses and the usage reports — lands in the month the owner chose.
--
-- Nullable on purpose: existing rows are backfilled below, and the services
-- fall back to today-in-Bahrain when a submission omits it, so in-flight
-- worker submissions stay valid.
-- ============================================================================

ALTER TABLE inventory_counts ADD COLUMN effective_on date;
ALTER TABLE waste_logs       ADD COLUMN effective_on date;

-- Backfill from the existing timestamps, read as Bahrain business dates
-- (the shop's day boundary, matching todayInBahrain()).
UPDATE inventory_counts
   SET effective_on = (counted_at AT TIME ZONE 'Asia/Bahrain')::date
 WHERE effective_on IS NULL;

UPDATE waste_logs
   SET effective_on = (created_at AT TIME ZONE 'Asia/Bahrain')::date
 WHERE effective_on IS NULL;

-- Count and waste reports filter by business date.
CREATE INDEX inventory_counts_effective_on_idx ON inventory_counts (effective_on);
CREATE INDEX waste_logs_effective_on_idx       ON waste_logs (effective_on);

-- No RLS changes: both tables keep their existing owner/worker policies, and
-- effective_on carries no cost data.
