-- ============================================================================
-- Rush OS — Money module, part 3: Recurring / Upcoming costs
--
-- Planning list for predictable outgoings (rent, salaries, subscriptions,
-- installments). They are NOT a payment until the owner marks one paid — at
-- which point the service records a real expense and advances the next due
-- date. Owner-only.
-- ============================================================================

CREATE TABLE recurring_costs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  cost_type      text NOT NULL DEFAULT 'Other',
  amount_fils    bigint NOT NULL CHECK (amount_fils >= 0),
  frequency      text NOT NULL DEFAULT 'Monthly'
                   CHECK (frequency IN ('Monthly', 'Weekly', 'On invoice', 'One-time')),
  next_due_date  date NOT NULL,
  default_method text NOT NULL DEFAULT 'Bank transfer',
  active         boolean NOT NULL DEFAULT true,
  created_by     uuid REFERENCES auth.users (id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recurring_costs_due_idx ON recurring_costs (next_due_date)
  WHERE active;

CREATE TRIGGER recurring_costs_updated_at BEFORE UPDATE ON recurring_costs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE recurring_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_costs_owner_all ON recurring_costs
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
