-- ============================================================================
-- Rush OS — Purchases: Ordered / Paid / Received become independent facts.
--
-- Part 2 of 2 (the 'ordered' enum value was added in …090000).
--
-- The three facts on a single purchases row:
--   * Ordered  — the row exists; status = 'ordered'; no stock, no cash. Owner
--                OR worker may log it. No review gate.
--   * Paid     — is_paid / paid_method / paid_on / due_date. Owner-only for
--                supplier settlement; a worker cash purchase records register
--                cash it physically took (posted immediately, reviewed after).
--   * Received — status moves needs_review -> approved; stock lands on approval.
--                Owner receipts auto-approve; worker receipts wait in Review.
--
-- Cash is posted the moment money physically moves (see the worker
-- cash_movements insert policy), so the register balance is always truthful —
-- it never waits for owner approval.
-- ============================================================================

-- ---------- New timing columns ----------------------------------------------

ALTER TABLE purchases
  ADD COLUMN paid_on     date,   -- when payment actually posted (null = unpaid / not yet posted)
  ADD COLUMN received_on date;   -- when stock landed (status -> approved)

-- ---------- Cost-free views for workers -------------------------------------
-- Mirror the inventory_items_worker pattern: SECURITY DEFINER views expose the
-- operational columns of every non-cancelled purchase, but never money
-- (total_fils, unit_cost_fils, line_total_fils, paid_method, paid_on). Workers
-- see paid/unpaid + due date, so those stay.

CREATE VIEW purchases_worker
WITH (security_invoker = false) AS
  SELECT id, supplier_id, purchased_on, is_paid, due_date, status,
         created_by, received_on, created_at
  FROM purchases
  WHERE status != 'voided';

GRANT SELECT ON purchases_worker TO authenticated;

CREATE VIEW purchase_items_worker
WITH (security_invoker = false) AS
  SELECT pi.id, pi.purchase_id, pi.inventory_item_id, pi.purchase_qty,
         pi.base_qty, pi.expiry_date, pi.created_at
  FROM purchase_items pi
  JOIN purchases p ON p.id = pi.purchase_id
  WHERE p.status != 'voided';

GRANT SELECT ON purchase_items_worker TO authenticated;

-- ---------- Guard: workers can never change payment fields ------------------
-- RLS is row-level, not column-level, so a worker's receive UPDATE (allowed
-- below) is stopped from touching money by this trigger. is_paid at INSERT
-- time is fine — that is how a worker cash purchase records till cash it took.

CREATE OR REPLACE FUNCTION guard_purchase_worker_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_owner() THEN
    IF NEW.is_paid     IS DISTINCT FROM OLD.is_paid
       OR NEW.paid_method IS DISTINCT FROM OLD.paid_method
       OR NEW.paid_on   IS DISTINCT FROM OLD.paid_on
       OR NEW.due_date  IS DISTINCT FROM OLD.due_date
       OR NEW.total_fils IS DISTINCT FROM OLD.total_fils THEN
      RAISE EXCEPTION 'Workers cannot change payment fields on a purchase';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchases_guard_worker_columns
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION guard_purchase_worker_columns();

-- ---------- Worker RLS: order + receive -------------------------------------

-- Replace the insert policy so workers may log an order ('ordered', never paid)
-- or submit a receipt / cash purchase ('needs_review').
DROP POLICY IF EXISTS purchases_worker_insert ON purchases;
CREATE POLICY purchases_worker_insert ON purchases
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      (status = 'ordered' AND is_paid = false)
      OR status = 'needs_review'
    )
  );

-- Workers may mark any open order received: ordered -> needs_review. The guard
-- trigger blocks money changes; the owner still approves before stock moves.
CREATE POLICY purchases_worker_receive ON purchases
  FOR UPDATE
  USING (status = 'ordered')
  WITH CHECK (status = 'needs_review');

-- Workers may overwrite the received quantity on an order that is still open
-- (before it flips to needs_review). Cost is (re)set by the owner on approval.
CREATE POLICY purchase_items_worker_receive ON purchase_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_items.purchase_id AND p.status = 'ordered'
    )
  );

-- ---------- Worker RLS: post register cash immediately ----------------------
-- A worker cash purchase deducts the register the instant it is recorded, so
-- the balance reflects the money that left the drawer. Scoped hard: only an
-- 'out' register movement, tagged as a purchase payment, created by the worker.
-- Workers still have NO select on cash_movements — they cannot read balances.

CREATE POLICY cash_movements_worker_insert ON cash_movements
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND direction = 'out'
    AND account = 'register'
    AND affects_pl = false
    AND source_type = 'purchase_payment'
  );
