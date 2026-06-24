-- ============================================================================
-- Rush OS — Phase B: Daily Closing (EOD)
--
-- The official daily revenue + cash record. A worker submits the end-of-day
-- numbers and a cash count; the entry goes to owner review (mirrors the
-- worker-submit -> owner-review pattern used elsewhere). Approving a closing
-- does NOT touch inventory — Daily EOD is the revenue record, not a stock
-- movement (POS Sales By Item drives inventory/COGS separately).
--
-- All money is integer fils. One non-voided closing per report_date.
-- ============================================================================

CREATE TABLE daily_closings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date           date NOT NULL,

  -- EOD figures from the POS summary
  total_orders          integer NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  discount_fils         bigint  NOT NULL DEFAULT 0 CHECK (discount_fils >= 0),
  cash_sales_fils       bigint  NOT NULL DEFAULT 0 CHECK (cash_sales_fils >= 0),
  card_sales_fils       bigint  NOT NULL DEFAULT 0 CHECK (card_sales_fils >= 0),
  benefitpay_sales_fils bigint  NOT NULL DEFAULT 0 CHECK (benefitpay_sales_fils >= 0),
  delivery_sales_fils   bigint  NOT NULL DEFAULT 0 CHECK (delivery_sales_fils >= 0),
  -- gross_sales = cash + card + benefitpay + delivery (stored for fast reads)
  gross_sales_fils      bigint  NOT NULL DEFAULT 0 CHECK (gross_sales_fils >= 0),

  -- Cash drawer reconciliation
  cash_counted_fils     bigint  NOT NULL DEFAULT 0 CHECK (cash_counted_fils >= 0),
  cash_expected_fils    bigint  NOT NULL DEFAULT 0 CHECK (cash_expected_fils >= 0),
  cash_variance_fils    bigint  NOT NULL DEFAULT 0,   -- counted - expected; may be negative

  notes                 text,
  status                review_status NOT NULL DEFAULT 'needs_review',
  created_by            uuid REFERENCES auth.users (id),
  reviewed_by           uuid REFERENCES auth.users (id),
  reviewed_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- One active (non-voided) closing per day.
CREATE UNIQUE INDEX daily_closings_date_uniq
  ON daily_closings (report_date)
  WHERE status != 'voided';

CREATE INDEX daily_closings_status_idx ON daily_closings (status);

CREATE TRIGGER daily_closings_updated_at BEFORE UPDATE ON daily_closings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS (mirrors complimentary_logs / waste_logs) -------------------

ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

-- Owner: full access.
CREATE POLICY daily_closings_owner_all ON daily_closings
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- Workers can submit their own closing, only as needs_review.
CREATE POLICY daily_closings_worker_insert ON daily_closings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

-- Workers can read their own submissions.
CREATE POLICY daily_closings_worker_select ON daily_closings
  FOR SELECT USING (created_by = auth.uid());

-- Workers can delete their own closing while still pending.
CREATE POLICY daily_closings_worker_delete ON daily_closings
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'needs_review'
  );
