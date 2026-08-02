import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { getItemDeletionImpact, removeItem, getAllItems } from "@/services/inventory";
import { listUsageBetween } from "@/repositories/inventory-usage";

const db = (f: FakeDb) => f as unknown as SupabaseClient;

function seed(): FakeDb {
  return makeFakeDb({
    inventory_items: [
      {
        id: "milk",
        name: "Milk",
        base_unit: "ml",
        stock_unit: "L",
        base_per_stock: 1000,
        stock_base_qty: 4000,
        stock_value_fils: 800,
        default_cost_fils: 0.2,
        costing_method: "weighted_average",
        status: "approved",
      },
      {
        id: "napkin",
        name: "Napkins",
        base_unit: "pc",
        stock_unit: "pack",
        base_per_stock: 100,
        stock_base_qty: 500,
        stock_value_fils: 250,
        default_cost_fils: 0.5,
        costing_method: "weighted_average",
        status: "approved",
      },
    ],
    products: [
      { id: "latte", name: "Latte", price_fils: 1400, status: "approved" },
      { id: "flat", name: "Flat White", price_fils: 1400, status: "approved" },
      { id: "old", name: "Retired Drink", price_fils: 1000, status: "voided" },
    ],
    recipe_ingredients: [
      { id: "r1", product_id: "latte", inventory_item_id: "milk", qty_base: 200 },
      { id: "r2", product_id: "flat", inventory_item_id: "milk", qty_base: 150 },
      { id: "r3", product_id: "old", inventory_item_id: "milk", qty_base: 150 },
    ],
    inventory_usage: [
      {
        id: "u1",
        occurred_on: "2026-07-10",
        source_type: "pos_import",
        source_id: "imp1",
        inventory_item_id: "milk",
        qty_base: 200,
        cogs_fils: 40,
      },
    ],
  });
}

describe("inventory item deletion", () => {
  it("reports the recipes and remaining stock that deleting would affect", async () => {
    const f = seed();

    const impact = await getItemDeletionImpact(db(f), "milk");

    expect(impact).not.toBeNull();
    expect(impact!.itemName).toBe("Milk");
    expect(impact!.stockBaseQty).toBe(4000);
    expect(impact!.stockValueFils).toBe(800);
    // Voided products are not worth warning about.
    expect(impact!.inRecipes.map((p) => p.name).sort()).toEqual([
      "Flat White",
      "Latte",
    ]);
  });

  it("reports no recipes for an item nothing uses", async () => {
    const f = seed();

    const impact = await getItemDeletionImpact(db(f), "napkin");

    expect(impact!.inRecipes).toEqual([]);
  });

  it("returns null for an item that does not exist", async () => {
    const f = seed();
    expect(await getItemDeletionImpact(db(f), "nope")).toBeNull();
  });

  it("hides a deleted item from lists but keeps its usage history", async () => {
    const f = seed();

    await removeItem(db(f), "milk");

    const remaining = await getAllItems(db(f));
    expect(remaining.map((i) => i.id)).toEqual(["napkin"]);

    // History is untouched, so past Profit/Losses numbers do not move.
    const usage = await listUsageBetween(db(f), "2026-07-01", "2026-08-01");
    expect(usage).toHaveLength(1);
    expect(usage[0].inventoryItemId).toBe("milk");
  });
});
