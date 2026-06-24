-- ============================================================================
-- Rush OS — seed data + complimentary product picker support
-- ============================================================================

-- Part 1: Seed data from design prototype (idempotent: skips if data exists)

DO $$
DECLARE
  v_supplier_awal      uuid;
  v_supplier_barista   uuid;
  v_supplier_origin    uuid;
  v_supplier_packpro   uuid;
  v_supplier_bake      uuid;
  v_item_fresh_milk    uuid;
  v_item_oat_milk      uuid;
  v_item_ethiopia      uuid;
  v_item_espresso_blend uuid;
  v_item_cups          uuid;
  v_item_lids          uuid;
  v_item_vanilla       uuid;
  v_item_cookies       uuid;
  v_item_matcha        uuid;
  v_item_paper_bags    uuid;
  v_prod_v60           uuid;
  v_prod_flat_white    uuid;
  v_prod_oat_latte     uuid;
  v_prod_matcha_latte  uuid;
  v_prod_espresso      uuid;
  v_prod_cookie        uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM suppliers WHERE name = 'Awal Dairy') THEN
    RAISE NOTICE 'Seed data already exists, skipping.';
    RETURN;
  END IF;

  INSERT INTO suppliers (id, name, lead_time_days, notes, status)
  VALUES (gen_random_uuid(), 'Awal Dairy', 1, 'Local dairy supplier', 'approved')
  RETURNING id INTO v_supplier_awal;

  INSERT INTO suppliers (id, name, lead_time_days, notes, status)
  VALUES (gen_random_uuid(), 'Barista Supplies Co', 3, 'Alt milks, syrups, tools', 'approved')
  RETURNING id INTO v_supplier_barista;

  INSERT INTO suppliers (id, name, lead_time_days, notes, status)
  VALUES (gen_random_uuid(), 'Origin Roasters', 5, 'Coffee beans and matcha', 'approved')
  RETURNING id INTO v_supplier_origin;

  INSERT INTO suppliers (id, name, lead_time_days, notes, status)
  VALUES (gen_random_uuid(), 'PackPro', 7, 'Cups, lids, bags', 'approved')
  RETURNING id INTO v_supplier_packpro;

  INSERT INTO suppliers (id, name, lead_time_days, notes, status)
  VALUES (gen_random_uuid(), 'Daily Bake', 1, 'Fresh bakery items', 'approved')
  RETURNING id INTO v_supplier_bake;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'Fresh Milk', 'Dairy', 'L', 'case', 12,
    'required', 3, 12, 18, 9000, v_supplier_awal, 'approved')
  RETURNING id INTO v_item_fresh_milk;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'Oat Milk', 'Dairy Alt', 'L', 'case', 6,
    'required', 4, 6, 2, 4400, v_supplier_barista, 'approved')
  RETURNING id INTO v_item_oat_milk;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'Ethiopia Beans', 'Coffee', 'g', 'kg', 1000,
    'optional', 7, 3000, 4200, 71400, v_supplier_origin, 'approved')
  RETURNING id INTO v_item_ethiopia;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'House Espresso Blend', 'Coffee', 'g', 'kg', 1000,
    'optional', 7, 4000, 5600, 89600, v_supplier_origin, 'approved')
  RETURNING id INTO v_item_espresso_blend;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), '12oz Cups', 'Packaging', 'pc', 'box', 1000,
    'not_needed', 10, 200, 50, 1500, v_supplier_packpro, 'approved')
  RETURNING id INTO v_item_cups;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), '12oz Lids', 'Packaging', 'pc', 'box', 1000,
    'not_needed', 10, 200, 900, 18000, v_supplier_packpro, 'approved')
  RETURNING id INTO v_item_lids;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'Vanilla Syrup', 'Syrups', 'ml', 'case', 4500,
    'optional', 5, 3000, 2250, 7500, v_supplier_barista, 'approved')
  RETURNING id INTO v_item_vanilla;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'Chocolate Cookies', 'Bakery', 'pc', 'tray', 24,
    'required', 1, 12, 24, 4800, v_supplier_bake, 'approved')
  RETURNING id INTO v_item_cookies;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'Matcha Powder', 'Tea', 'g', 'tin', 500,
    'optional', 7, 300, 800, 24000, v_supplier_origin, 'approved')
  RETURNING id INTO v_item_matcha;

  INSERT INTO inventory_items (id, name, category, base_unit, purchase_unit, units_per_purchase,
    expiry, safety_days, min_base_qty, stock_base_qty, stock_value_fils, supplier_id, status)
  VALUES (gen_random_uuid(), 'Paper Bags', 'Packaging', 'pc', 'pack', 250,
    'not_needed', 10, 150, 320, 6400, v_supplier_packpro, 'approved')
  RETURNING id INTO v_item_paper_bags;

  INSERT INTO products (id, name, category, price_fils)
  VALUES (gen_random_uuid(), 'V60 Cold Coffee', 'Specialty', 1500)
  RETURNING id INTO v_prod_v60;

  INSERT INTO products (id, name, category, price_fils)
  VALUES (gen_random_uuid(), 'Flat White', 'Hot', 1400)
  RETURNING id INTO v_prod_flat_white;

  INSERT INTO products (id, name, category, price_fils)
  VALUES (gen_random_uuid(), 'Oat Latte', 'Hot', 1700)
  RETURNING id INTO v_prod_oat_latte;

  INSERT INTO products (id, name, category, price_fils)
  VALUES (gen_random_uuid(), 'Iced Matcha Latte', 'Matcha', 1900)
  RETURNING id INTO v_prod_matcha_latte;

  INSERT INTO products (id, name, category, price_fils)
  VALUES (gen_random_uuid(), 'Espresso', 'Hot', 800)
  RETURNING id INTO v_prod_espresso;

  INSERT INTO products (id, name, category, price_fils)
  VALUES (gen_random_uuid(), 'Chocolate Cookie', 'Bakery', 600)
  RETURNING id INTO v_prod_cookie;

  INSERT INTO recipe_ingredients (product_id, inventory_item_id, qty_base) VALUES
    (v_prod_v60, v_item_ethiopia, 20),
    (v_prod_v60, v_item_cups, 1),
    (v_prod_v60, v_item_lids, 1);

  INSERT INTO recipe_ingredients (product_id, inventory_item_id, qty_base) VALUES
    (v_prod_flat_white, v_item_espresso_blend, 18),
    (v_prod_flat_white, v_item_fresh_milk, 0.15),
    (v_prod_flat_white, v_item_cups, 1),
    (v_prod_flat_white, v_item_lids, 1);

  INSERT INTO recipe_ingredients (product_id, inventory_item_id, qty_base) VALUES
    (v_prod_oat_latte, v_item_espresso_blend, 18),
    (v_prod_oat_latte, v_item_oat_milk, 0.2),
    (v_prod_oat_latte, v_item_cups, 1),
    (v_prod_oat_latte, v_item_lids, 1);

  INSERT INTO recipe_ingredients (product_id, inventory_item_id, qty_base) VALUES
    (v_prod_matcha_latte, v_item_matcha, 4),
    (v_prod_matcha_latte, v_item_fresh_milk, 0.2),
    (v_prod_matcha_latte, v_item_vanilla, 15),
    (v_prod_matcha_latte, v_item_cups, 1),
    (v_prod_matcha_latte, v_item_lids, 1);

  INSERT INTO recipe_ingredients (product_id, inventory_item_id, qty_base) VALUES
    (v_prod_espresso, v_item_espresso_blend, 18);

  INSERT INTO recipe_ingredients (product_id, inventory_item_id, qty_base) VALUES
    (v_prod_cookie, v_item_cookies, 1);

  RAISE NOTICE 'Seed data inserted: 5 suppliers, 10 inventory items, 6 products with recipes.';
END;
$$;

-- Part 2: Complimentary product picker support

ALTER TABLE complimentary_logs
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

CREATE POLICY complimentary_worker_delete ON complimentary_logs
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'needs_review'
  );

CREATE POLICY products_worker_select ON products
  FOR SELECT USING (true);
