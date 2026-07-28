import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { processImportInventory, voidImport } from "@/services/pos-import";

/**
 * POS deduction + usage ledger behavior:
 *  - full sold quantity is deducted, going NEGATIVE when on-hand is short
 *  - per-(product, item) ledger rows are written, with COGS allocations that
 *    sum exactly to each item's recorded COGS
 *  - re-processing is a no-op; voiding restores stock and clears the ledger
 */

const IMPORT_ID = "00000000-0000-0000-0000-00000000imp1";
const MILK = "00000000-0000-0000-0000-0000000000m1";
const CUPS = "00000000-0000-0000-0000-0000000000c1";
const LATTE = "00000000-0000-0000-0000-0000000000p1";
const STAFF_DRINK = "00000000-0000-0000-0000-0000000000p2";
const GROUP_MENU = "00000000-0000-0000-0000-0000000000g1";
const GROUP_STAFF = "00000000-0000-0000-0000-0000000000g2";

function seedDb(): FakeDb {
  return makeFakeDb({
    inventory_items: [
      {
        id: MILK,
        name: "Milk",
        base_unit: "ml",
        stock_unit: "L",
        base_per_stock: 1000,
        purchase_unit: "carton",
        units_per_purchase: 12,
        expiry: "optional",
        tracks_open: false,
        min_base_qty: 0,
        safety_days: 0,
        // 10 000 ml worth 5 000 fils -> avg 0.5 fils/ml
        stock_base_qty: 10000,
        stock_value_fils: 5000,
        last_unit_cost_fils: 0.5,
        default_cost_fils: 0.5,
        costing_method: "weighted_average",
        status: "approved",
      },
      {
        id: CUPS,
        name: "Cups",
        base_unit: "pc",
        stock_unit: "pc",
        base_per_stock: 1,
        purchase_unit: "sleeve",
        units_per_purchase: 50,
        expiry: "not_needed",
        tracks_open: false,
        min_base_qty: 0,
        safety_days: 0,
        // Only 5 on hand worth 150 fils (avg 30) — the import needs 8.
        stock_base_qty: 5,
        stock_value_fils: 150,
        last_unit_cost_fils: 0,
        default_cost_fils: 30,
        costing_method: "weighted_average",
        status: "approved",
      },
    ],
    product_groups: [
      { id: GROUP_MENU, name: "Menu", sort_order: 1 },
      { id: GROUP_STAFF, name: "Staff", sort_order: 2 },
    ],
    products: [
      {
        id: LATTE,
        name: "Latte",
        price_fils: 1400,
        group_id: GROUP_MENU,
        status: "approved",
      },
      {
        id: STAFF_DRINK,
        name: "Staff Drink",
        price_fils: 0,
        group_id: GROUP_STAFF,
        status: "approved",
      },
    ],
    recipe_ingredients: [
      { id: "r1", product_id: LATTE, inventory_item_id: MILK, qty_base: 200 },
      { id: "r2", product_id: STAFF_DRINK, inventory_item_id: MILK, qty_base: 150 },
      { id: "r3", product_id: STAFF_DRINK, inventory_item_id: CUPS, qty_base: 1 },
    ],
    pos_imports: [
      {
        id: IMPORT_ID,
        report_type: "sales_by_item",
        branch: "Rush",
        report_date: "2026-07-20",
        file_name: "sales.xlsx",
        file_hash: "hash1",
        status: "processed",
        row_count: 2,
        inventory_deducted: false,
        deduction_details: null,
      },
    ],
    pos_sales_rows: [
      {
        id: "sr1",
        import_id: IMPORT_ID,
        pos_item_id: 1,
        pos_item_name: "Latte",
        category: "HOT",
        qty_sold: 10,
        amount_fils: 14000,
        product_id: LATTE,
        status: "mapped",
      },
      {
        id: "sr2",
        import_id: IMPORT_ID,
        pos_item_id: 2,
        pos_item_name: "Staff Drink",
        category: "STAFF",
        qty_sold: 8,
        amount_fils: 0,
        product_id: STAFF_DRINK,
        status: "mapped",
      },
    ],
  });
}

const asClient = (db: FakeDb) => db as unknown as SupabaseClient;

describe("processImportInventory with usage ledger", () => {
  it("deducts full sold quantity (negative when short) and records COGS", async () => {
    const db = seedDb();
    const { deductions, alreadyDeducted } = await processImportInventory(
      asClient(db),
      IMPORT_ID,
    );
    expect(alreadyDeducted).toBe(false);

    // Milk: 10x200 + 8x150 = 3200 ml at avg 0.5 -> 1600 fils COGS.
    const milk = db.tables.inventory_items.find((i) => i.id === MILK)!;
    expect(milk.stock_base_qty).toBe(10000 - 3200);
    expect(milk.stock_value_fils).toBe(5000 - 1600);

    // Cups: needs 8, only 5 on hand -> goes negative; shortfall of 3 costed
    // at the default 30 fils. COGS = 150 (all on-hand value) + 90 = 240.
    const cups = db.tables.inventory_items.find((i) => i.id === CUPS)!;
    expect(cups.stock_base_qty).toBe(-3);
    expect(cups.stock_value_fils).toBe(-90);

    const cupsDeduction = deductions.find((d) => d.inventoryItemId === CUPS)!;
    expect(cupsDeduction.baseQtyDeducted).toBe(8);
    expect(cupsDeduction.cogsFils).toBe(240);
  });

  it("writes per-product ledger rows whose COGS sums exactly to each item's COGS", async () => {
    const db = seedDb();
    const { deductions } = await processImportInventory(asClient(db), IMPORT_ID);

    const usage = db.tables.inventory_usage;
    // Milk is split across Latte + Staff Drink; Cups has one row.
    expect(usage).toHaveLength(3);
    expect(usage.every((u) => u.occurred_on === "2026-07-20")).toBe(true);
    expect(usage.every((u) => u.source_type === "pos_import")).toBe(true);
    expect(usage.every((u) => u.source_id === IMPORT_ID)).toBe(true);

    for (const d of deductions) {
      const rows = usage.filter((u) => u.inventory_item_id === d.inventoryItemId);
      const totalCogs = rows.reduce((s, u) => s + u.cogs_fils, 0);
      const totalQty = rows.reduce((s, u) => s + u.qty_base, 0);
      expect(totalCogs).toBe(d.cogsFils);
      expect(totalQty).toBe(d.baseQtyDeducted);
    }

    // Group attribution is snapshotted per product.
    const latteMilk = usage.find(
      (u) => u.product_id === LATTE && u.inventory_item_id === MILK,
    )!;
    expect(latteMilk.product_group_id).toBe(GROUP_MENU);
    expect(latteMilk.product_group_name).toBe("Menu");
    expect(latteMilk.qty_base).toBe(2000);
    expect(latteMilk.cogs_fils).toBe(1000); // 2000 ml at 0.5

    const staffCups = usage.find(
      (u) => u.product_id === STAFF_DRINK && u.inventory_item_id === CUPS,
    )!;
    expect(staffCups.product_group_name).toBe("Staff");
    expect(staffCups.cogs_fils).toBe(240);
  });

  it("is idempotent: re-processing a deducted import is a no-op", async () => {
    const db = seedDb();
    await processImportInventory(asClient(db), IMPORT_ID);
    const milkAfterFirst = db.tables.inventory_items.find((i) => i.id === MILK)!
      .stock_base_qty;

    const second = await processImportInventory(asClient(db), IMPORT_ID);
    expect(second.alreadyDeducted).toBe(true);
    expect(
      db.tables.inventory_items.find((i) => i.id === MILK)!.stock_base_qty,
    ).toBe(milkAfterFirst);
    expect(db.tables.inventory_usage).toHaveLength(3);
  });

  it("voiding restores stock (including negative items) and clears the ledger", async () => {
    const db = seedDb();
    await processImportInventory(asClient(db), IMPORT_ID);
    await voidImport(asClient(db), IMPORT_ID);

    const milk = db.tables.inventory_items.find((i) => i.id === MILK)!;
    expect(milk.stock_base_qty).toBe(10000);
    expect(milk.stock_value_fils).toBe(5000);

    // Cups were at -3/-90 after deduction; restoring +8/+240 gives back 5/150.
    const cups = db.tables.inventory_items.find((i) => i.id === CUPS)!;
    expect(cups.stock_base_qty).toBe(5);
    expect(cups.stock_value_fils).toBe(150);

    expect(db.tables.inventory_usage).toHaveLength(0);
    expect(
      db.tables.pos_imports.find((i) => i.id === IMPORT_ID)!.status,
    ).toBe("voided");
  });

  it("skips voided products entirely", async () => {
    const db = seedDb();
    db.tables.products.find((p) => p.id === STAFF_DRINK)!.status = "voided";

    await processImportInventory(asClient(db), IMPORT_ID);

    // Only the latte's milk was deducted; cups untouched.
    const milk = db.tables.inventory_items.find((i) => i.id === MILK)!;
    expect(milk.stock_base_qty).toBe(10000 - 2000);
    const cups = db.tables.inventory_items.find((i) => i.id === CUPS)!;
    expect(cups.stock_base_qty).toBe(5);
    expect(db.tables.inventory_usage).toHaveLength(1);
  });
});
