-- ============================================================================
-- Rush OS — Money module, part 1: Foundation
--
-- Owner-only financial records. Two new concepts:
--   * expenses        — normal business expenses (hit cash flow AND P&L). One
--                       receipt can split across categories (expense_lines).
--   * cash_movements  — manual money in/out not tied to a sale or purchase
--                       (owner injection, withdrawal, bank transfer, etc.).
--                       The cash log is the source of truth for cash position.
--
-- All money is integer fils. Money is owner-only — workers must never read it,
-- so every table here is gated to is_owner() with no worker policy.
-- ============================================================================

-- ---------- Expenses --------------------------------------------------------

CREATE TABLE expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on    date NOT NULL DEFAULT current_date,
  method      text NOT NULL DEFAULT 'Cash',
  note        text,
  receipt_path text,
  -- Sum of the expense_lines; stored for fast reads, validated in the service.
  total_fils  bigint NOT NULL DEFAULT 0 CHECK (total_fils >= 0),
  created_by  uuid REFERENCES auth.users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expense_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  uuid NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
  category    text NOT NULL,
  amount_fils bigint NOT NULL CHECK (amount_fils >= 0),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expense_lines_expense_idx ON expense_lines (expense_id);
CREATE INDEX expenses_spent_on_idx ON expenses (spent_on);

CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Cash movements (manual cash log) --------------------------------

CREATE TABLE cash_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction   text NOT NULL CHECK (direction IN ('in', 'out')),
  reason      text NOT NULL,
  amount_fils bigint NOT NULL CHECK (amount_fils > 0),
  method      text NOT NULL DEFAULT 'Cash',
  occurred_on date NOT NULL DEFAULT current_date,
  -- Most movements are cash-flow only; some (e.g. owner withdrawal of profit)
  -- the owner may flag as affecting P&L.
  affects_pl  boolean NOT NULL DEFAULT false,
  note        text,
  created_by  uuid REFERENCES auth.users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cash_movements_occurred_idx ON cash_movements (occurred_on);

CREATE TRIGGER cash_movements_updated_at BEFORE UPDATE ON cash_movements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS: owner-only -------------------------------------------------

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_owner_all ON expenses
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY expense_lines_owner_all ON expense_lines
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY cash_movements_owner_all ON cash_movements
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
