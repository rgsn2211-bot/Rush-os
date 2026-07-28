-- ============================================================================
-- Rush OS — Allow BenefitPay in the settlement payments ledger
--
-- BenefitPay now uses the same running-total ledger as card and delivery
-- (record payouts received + commission taken) instead of the old per-row
-- confirm. Widen the channel check to accept 'benefitpay'.
-- ============================================================================

ALTER TABLE settlement_payments
  DROP CONSTRAINT settlement_payments_channel_check;

ALTER TABLE settlement_payments
  ADD CONSTRAINT settlement_payments_channel_check
  CHECK (channel IN ('card', 'delivery', 'benefitpay'));
