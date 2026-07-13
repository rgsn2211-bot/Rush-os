-- ============================================================================
-- Rush OS — Worker Cash Out from Register posts immediately.
--
-- Cash physically leaves the drawer the instant a worker records a register
-- cash-out (a till purchase or a withdrawal), so the register movement must be
-- posted then — not on owner approval. Otherwise the balance reads high until
-- the owner gets to it. Owner review becomes oversight: approve confirms,
-- reject reverses the movement.
--
-- This widens the worker cash_movements insert policy (added for purchase
-- payments) to also cover register cash-outs, and lets a worker reverse the
-- movement behind a *pending* cash-out they still own (used when they delete
-- their own pending submission, or the owner rejects it under their own token).
-- Workers still have NO select on cash_movements — they cannot read balances.
-- ============================================================================

DROP POLICY IF EXISTS cash_movements_worker_insert ON cash_movements;
CREATE POLICY cash_movements_worker_insert ON cash_movements
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND direction = 'out'
    AND account = 'register'
    AND affects_pl = false
    AND source_type IN ('purchase_payment', 'register_cash_out')
  );

-- A worker may delete the register movement behind their own still-pending
-- cash-out (reversal when they remove that submission before review).
CREATE POLICY cash_movements_worker_delete ON cash_movements
  FOR DELETE USING (
    created_by = auth.uid()
    AND source_type = 'register_cash_out'
    AND EXISTS (
      SELECT 1 FROM register_cash_outs r
      WHERE r.id = cash_movements.source_id
        AND r.created_by = auth.uid()
        AND r.status = 'needs_review'
    )
  );
