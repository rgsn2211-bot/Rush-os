-- ============================================================================
-- Rush OS — Delivery platforms (commission control)
--
-- The owner runs several delivery apps (Jahez, Talabat, Keeta, Beanz), each
-- with its own commission. These rates drive the "how much I should receive"
-- (expected settlement) that EOD approval creates per platform.
--
--   commission_bps  — commission in basis points (2500 = 25%). Integer to keep
--                     all money math integer (fils), matching the project rule.
--   fixed_fee_fils  — fee charged per order, in fils.
--
-- Owner-only for the rates. Workers need the platform NAMES to fill in per-app
-- sales at EOD, so they read a cost-free view that hides the commission columns.
-- ============================================================================

CREATE TABLE delivery_platforms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,
  commission_bps integer NOT NULL DEFAULT 0 CHECK (commission_bps >= 0),
  fixed_fee_fils bigint NOT NULL DEFAULT 0 CHECK (fixed_fee_fils >= 0),
  active         boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER delivery_platforms_updated_at BEFORE UPDATE ON delivery_platforms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the four platforms. Prototype rates where known; owner edits the rest.
INSERT INTO delivery_platforms (name, commission_bps, fixed_fee_fils, sort_order)
VALUES
  ('Jahez',   2000, 250, 1),
  ('Talabat', 2500, 300, 2),
  ('Keeta',      0,   0, 3),
  ('Beanz',      0,   0, 4);

-- ---------- RLS -------------------------------------------------------------

ALTER TABLE delivery_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY delivery_platforms_owner_all ON delivery_platforms
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- Cost-free view for workers: names only, no commission/fee. SECURITY DEFINER
-- so it bypasses the owner-only RLS on the base table (like inventory_items_worker).
CREATE VIEW delivery_platforms_worker
WITH (security_invoker = false) AS
  SELECT id, name, active, sort_order
  FROM delivery_platforms
  WHERE active = true;

GRANT SELECT ON delivery_platforms_worker TO authenticated;
