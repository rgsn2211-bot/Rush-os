-- ============================================================================
-- Rush OS — EOD per payment method (amount + orders) + per-platform delivery
--
-- The worker now records BOTH the amount AND the order count for each payment
-- method (cash, card, BenefitPay, and each delivery platform). Per-platform
-- delivery sales/orders live in a child table so the owner-set commission can
-- compute the expected payout per platform.
--
-- total_orders / delivery_sales_fils on daily_closings remain the SUMS (kept in
-- sync by the service) so existing reads keep working.
-- ============================================================================

ALTER TABLE daily_closings
  ADD COLUMN cash_orders       integer NOT NULL DEFAULT 0 CHECK (cash_orders >= 0),
  ADD COLUMN card_orders       integer NOT NULL DEFAULT 0 CHECK (card_orders >= 0),
  ADD COLUMN benefitpay_orders integer NOT NULL DEFAULT 0 CHECK (benefitpay_orders >= 0);

CREATE TABLE daily_closing_delivery_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id  uuid NOT NULL REFERENCES daily_closings (id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES delivery_platforms (id),
  sales_fils  bigint NOT NULL DEFAULT 0 CHECK (sales_fils >= 0),
  orders      integer NOT NULL DEFAULT 0 CHECK (orders >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (closing_id, platform_id)
);

CREATE INDEX daily_closing_delivery_lines_closing_idx
  ON daily_closing_delivery_lines (closing_id);

-- ---------- RLS (mirrors purchase_items) ------------------------------------

ALTER TABLE daily_closing_delivery_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY ddl_owner_all ON daily_closing_delivery_lines
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- Workers can add lines to their own closing submission.
CREATE POLICY ddl_worker_insert ON daily_closing_delivery_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_closings c
      WHERE c.id = closing_id
        AND c.created_by = auth.uid()
    )
  );

-- Workers can read lines belonging to their own closings.
CREATE POLICY ddl_worker_select ON daily_closing_delivery_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_closings c
      WHERE c.id = closing_id
        AND c.created_by = auth.uid()
    )
  );
