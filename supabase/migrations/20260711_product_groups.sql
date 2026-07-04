-- ============================================================================
-- Rush OS — Product groups (organizing the product list)
--
-- Products now cover more than the sellable menu: because a standalone product
-- with a recipe is the only thing that deducts inventory from a POS Sales-By-Item
-- line, the owner also models modifiers (extra shot, condensed milk, extra cup),
-- training usage (cup, milk) and staff drinks as their own products. That mixes
-- them into one flat list next to the real menu.
--
-- A product_group is an owner-managed bucket (Menu, Modifiers, Packaging,
-- Training, Staff, ...). It is purely organizational — it does NOT change how
-- inventory is deducted. `category` stays as the menu sub-label; the group is the
-- higher-level "what is this product for" dimension.
--
-- Workers read groups (to see the same organized list); only owners mutate them.
-- ============================================================================

CREATE TABLE product_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER product_groups_updated_at BEFORE UPDATE ON product_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A product belongs to at most one group. Deleting a group detaches its products
-- (they fall back to "Ungrouped") rather than deleting them.
ALTER TABLE products
  ADD COLUMN group_id uuid REFERENCES product_groups (id) ON DELETE SET NULL;

CREATE INDEX products_group_idx ON products (group_id);

-- Seed the buckets the owner uses. Menu first so the real menu leads the list.
INSERT INTO product_groups (name, sort_order)
VALUES
  ('Menu',      0),
  ('Modifiers', 1),
  ('Packaging', 2),
  ('Training',  3),
  ('Staff',     4)
ON CONFLICT (name) DO NOTHING;

-- Default all existing products into Menu so nothing lands "Ungrouped" on upgrade.
UPDATE products
  SET group_id = (SELECT id FROM product_groups WHERE name = 'Menu')
  WHERE group_id IS NULL;

-- ---------- RLS -------------------------------------------------------------
-- Mirror products: owners full access, workers read-only (no cost data here).

ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_groups_owner_all ON product_groups
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY product_groups_worker_select ON product_groups
  FOR SELECT USING (true);
