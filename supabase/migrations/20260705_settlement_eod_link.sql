-- ============================================================================
-- Rush OS — Link settlements to the EOD record
--
-- Approving a daily closing now auto-creates the "money I should receive" per
-- channel/platform. These columns tie each auto settlement back to the day it
-- came from so the owner can reconcile by date range and so a closing void can
-- find and remove its pending settlements.
-- ============================================================================

ALTER TABLE settlements
  ADD COLUMN sales_date        date,
  ADD COLUMN gross_fils        bigint CHECK (gross_fils IS NULL OR gross_fils >= 0),
  ADD COLUMN source_closing_id uuid REFERENCES daily_closings (id) ON DELETE SET NULL,
  ADD COLUMN auto_created      boolean NOT NULL DEFAULT false;

CREATE INDEX settlements_source_closing_idx ON settlements (source_closing_id);
CREATE INDEX settlements_sales_date_idx ON settlements (sales_date);
