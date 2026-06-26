-- ============================================================================
-- Rush OS — Worker Cash Out from Register
--
-- Workers record cash leaving the register during the day, for a purchase
-- (e.g. buying supplies with till cash) or a withdrawal. Each entry goes to
-- owner review (mirrors waste_logs). On approval the owner posts a register
-- cash-out movement so the register balance reflects the money that left.
-- ============================================================================

CREATE TABLE register_cash_outs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('purchase', 'withdrawal')),
  amount_fils bigint NOT NULL CHECK (amount_fils > 0),
  reason      text NOT NULL,
  note        text,
  status      review_status NOT NULL DEFAULT 'needs_review',
  created_by  uuid REFERENCES auth.users (id),
  reviewed_by uuid REFERENCES auth.users (id),
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX register_cash_outs_status_idx ON register_cash_outs (status);

CREATE TRIGGER register_cash_outs_updated_at BEFORE UPDATE ON register_cash_outs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS (mirrors waste_logs) ----------------------------------------

ALTER TABLE register_cash_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY register_cash_outs_owner_all ON register_cash_outs
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY register_cash_outs_worker_insert ON register_cash_outs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

CREATE POLICY register_cash_outs_worker_select ON register_cash_outs
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY register_cash_outs_worker_delete ON register_cash_outs
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'needs_review'
  );
