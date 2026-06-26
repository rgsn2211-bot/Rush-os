-- ============================================================================
-- Rush OS — RESET + REAL-DATA SEED
--
-- WHAT THIS DOES
--   1. Wipes ALL business data (inventory, products, purchases, POS, money,
--      closings, etc.) so you start from a clean slate.
--   2. Re-seeds the REQUIRED config (delivery platforms).
--   3. Seeds your REAL Rush data (suppliers, inventory items, products, recipes).
--
-- WHAT IT KEEPS
--   - `profiles` (your login + role). Your owner/worker accounts are NOT touched.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--   It is wrapped in a transaction: if anything fails, NOTHING is changed.
--   It is safe to run again — each run wipes and re-seeds from scratch.
--
-- MONEY IS INTEGER FILS (BHD x 1000):  1.500 BHD -> 1500   /   0.250 BHD -> 250
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- SECTION A — WIPE ALL BUSINESS DATA  (keeps `profiles`)
-- TRUNCATE ... CASCADE handles foreign-key order automatically.
-- ----------------------------------------------------------------------------
TRUNCATE TABLE
  register_cash_outs,
  daily_closing_delivery_lines,
  daily_closings,
  settlements,
  cash_movements,
  expense_lines,
  expenses,
  complimentary_logs,
  waste_logs,
  pos_sales_rows,
  pos_item_catalog,
  pos_raw_rows,
  pos_imports,
  purchase_items,
  purchases,
  recurring_costs,
  recipe_ingredients,
  products,
  inventory_items,
  suppliers,
  delivery_platforms
  RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- SECTION B — REQUIRED CONFIG: delivery platforms
-- The app expects these to exist (EOD per-platform sales + settlements).
-- Edit the commission (basis points: 2500 = 25%) and per-order fee (fils).
-- ----------------------------------------------------------------------------
INSERT INTO delivery_platforms (name, commission_bps, fixed_fee_fils, sort_order)
VALUES
  ('Jahez',   2000, 250, 1),   -- 20% commission, 0.250 BHD/order
  ('Talabat', 2500, 300, 2),   -- 25% commission, 0.300 BHD/order
  ('Keeta',      0,   0, 3),
  ('Beanz',      0,   0, 4)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SECTION C — YOUR REAL RUSH DATA
--
-- The block below is filled with the DEMO coffee-shop data as a WORKED EXAMPLE.
-- Replace the values with your real Rush suppliers / inventory / products /
-- recipes. Keep the structure:
--   1. Insert each supplier, capture its id into a variable.
--   2. Insert each inventory item (link to a supplier id), capture its id.
--   3. Insert each product (price_fils), capture its id.
--   4. Insert recipe_ingredients linking products -> inventory items.
--
-- Column guide for inventory_items:
--   base_unit        the smallest unit you track/use (e.g. 'L','g','ml','pc')
--   purchase_unit    how you BUY it (e.g. 'case','kg','box','tray')
--   units_per_purchase   how many base units per purchase unit (kg -> 1000 g)
--   expiry           'required' | 'optional' | 'not_needed'
--   safety_days      lead-time buffer in days
--   min_base_qty     low-stock alert threshold, in base units
--   stock_base_qty   current stock on hand, in base units
--   stock_value_fils current stock VALUE in fils  (value / qty = avg unit cost)
--   status           use 'approved' for items you enter directly
--
-- recipe_ingredients.qty_base = amount of the item used per ONE product sold,
--   expressed in the item's base unit (e.g. 0.15 L milk, 18 g coffee, 1 pc cup).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  -- suppliers
  v_supplier_awal       uuid;
  v_supplier_barista    uuid;
  v_supplier_origin     uuid;
  v_supplier_packpro    uuid;
  v_supplier_bake       uuid;
  -- inventory items
  v_item_fresh_milk     uuid;
  v_item_oat_milk       uuid;
  v_item_ethiopia       uuid;
  v_item_espresso_blend uuid;
  v_item_cups           uuid;
  v_item_lids           uuid;
  v_item_vanilla        uuid;
  v_item_cookies        uuid;
  v_item_matcha         uuid;
  v_item_paper_bags     uuid;
  -- products
  v_prod_v60            uuid;
  v_prod_flat_white     uuid;
  v_prod_oat_latte      uuid;
  v_prod_matcha_latte   uuid;
  v_prod_espresso       uuid;
  v_prod_cookie         uuid;
BEGIN
  -- ----- 1. SUPPLIERS -------------------------------------------------------
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

  -- ----- 2. INVENTORY ITEMS -------------------------------------------------
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

  -- ----- 3. PRODUCTS (price_fils = selling price in fils) -------------------
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

  -- ----- 4. RECIPES (qty_base = item used per one product, in base units) ---
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

  RAISE NOTICE 'Seed complete: suppliers, inventory items, products, and recipes inserted.';
END;
$$;

COMMIT;
