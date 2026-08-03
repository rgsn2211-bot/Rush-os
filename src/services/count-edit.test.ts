import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import {
  reviewCount,
  editCount,
  getCountWithItems,
} from "@/services/inventory-count";
import { listUsageBySource } from "@/repositories/inventory-usage";
import { getInventoryItem } from "@/repositories/inventory-items";

const db = (f: FakeDb) => f as unknown as SupabaseClient;

const MILK = "11111111-1111-4111-8111-111111111111";
const BEANS = "22222222-2222-4222-8222-222222222222";

/**
 * Milk: 4000 ml on hand worth 800 fils (0.2 fils/ml), counted at 3 L (3000 ml).
 * Beans: not on the count until the owner adds it.
 */
function seed(): FakeDb {
  return makeFakeDb({
    inventory_items: [
      {
        id: MILK,
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
        id: BEANS,
        name: "Beans",
        base_unit: "g",
        stock_unit: "kg",
        base_per_stock: 1000,
        stock_base_qty: 2000,
        stock_value_fils: 6000,
        default_cost_fils: 3,
        costing_method: "weighted_average",
        status: "approved",
      },
    ],
    inventory_counts: [
      {
        id: "c1",
        notes: null,
        counted_at: "2026-08-02T08:00:00Z",
        effective_on: "2026-07-31",
        status: "needs_review",
        created_by: "worker-1",
      },
    ],
    inventory_count_items: [
      {
        id: "l1",
        count_id: "c1",
        inventory_item_id: MILK,
        expected_base_qty: 4000,
        counted_base_qty: 3000,
        variance_base_qty: -1000,
        value_fils: 0,
        created_at: "2026-08-02T08:00:00Z",
      },
    ],
    inventory_usage: [],
    profiles: [{ id: "worker-1", display_name: "Sara" }],
  });
}

describe("editing a pending count", () => {
  it("changes the stored numbers without touching stock", async () => {
    const f = seed();

    await editCount(
      db(f),
      "c1",
      { items: [{ inventoryItemId: MILK, countedStockQty: 3.5 }] },
      "owner-1",
    );

    const item = await getInventoryItem(db(f), MILK);
    expect(item!.stockBaseQty).toBe(4000); // untouched until approval

    const count = await getCountWithItems(db(f), "c1");
    expect(count!.items).toHaveLength(1);
    expect(count!.items[0].countedBaseQty).toBe(3500);
    // Expected stays the snapshot the worker's count was taken against.
    expect(count!.items[0].expectedBaseQty).toBe(4000);
    expect(count!.items[0].varianceBaseQty).toBe(-500);
    expect(count!.status).toBe("needs_review");
  });

  it("approving after an edit reconciles to the corrected quantity", async () => {
    const f = seed();

    await editCount(
      db(f),
      "c1",
      { items: [{ inventoryItemId: MILK, countedStockQty: 3.5 }] },
      "owner-1",
    );
    await reviewCount(db(f), "c1", "approve", "owner-1");

    const item = await getInventoryItem(db(f), MILK);
    expect(item!.stockBaseQty).toBe(3500);
    expect(item!.stockValueFils).toBe(700); // 3500 x 0.2
  });
});

describe("editing an approved count", () => {
  it("lands on the new counted quantity and replaces the ledger rows", async () => {
    const f = seed();
    await reviewCount(db(f), "c1", "approve", "owner-1");

    // 4000 -> 3000: a 1000 ml shortage worth 200 fils.
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(3000);
    expect(await listUsageBySource(db(f), "count", "c1")).toHaveLength(1);

    // The worker actually meant 3.8 L.
    await editCount(
      db(f),
      "c1",
      { items: [{ inventoryItemId: MILK, countedStockQty: 3.8 }] },
      "owner-1",
    );

    const item = await getInventoryItem(db(f), MILK);
    expect(item!.stockBaseQty).toBe(3800);
    expect(item!.stockValueFils).toBe(760); // 3800 x 0.2, average preserved

    const rows = await listUsageBySource(db(f), "count", "c1");
    expect(rows).toHaveLength(1); // replaced, not duplicated
    expect(rows[0].qtyBase).toBe(200); // 4000 - 3800 shrinkage
    expect(rows[0].cogsFils).toBe(40);

    const count = await getCountWithItems(db(f), "c1");
    expect(count!.status).toBe("approved");
  });

  it("re-dates the loss when only the effective date changes", async () => {
    const f = seed();
    await reviewCount(db(f), "c1", "approve", "owner-1");
    expect((await listUsageBySource(db(f), "count", "c1"))[0].occurredOn).toBe(
      "2026-07-31",
    );

    await editCount(
      db(f),
      "c1",
      {
        effectiveOn: "2026-06-30",
        items: [{ inventoryItemId: MILK, countedStockQty: 3 }],
      },
      "owner-1",
    );

    const rows = await listUsageBySource(db(f), "count", "c1");
    expect(rows[0].occurredOn).toBe("2026-06-30");
    // Stock is unchanged — only the month the loss reports in moved.
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(3000);
  });

  it("snapshots the live on-hand as expected for an item the owner adds", async () => {
    const f = seed();
    await reviewCount(db(f), "c1", "approve", "owner-1");

    await editCount(
      db(f),
      "c1",
      {
        items: [
          { inventoryItemId: MILK, countedStockQty: 3 },
          { inventoryItemId: BEANS, countedStockQty: 1.8 },
        ],
      },
      "owner-1",
    );

    const count = await getCountWithItems(db(f), "c1");
    const beans = count!.items.find((l) => l.inventoryItemId === BEANS)!;
    expect(beans.expectedBaseQty).toBe(2000); // live on-hand at the time it was added
    expect(beans.countedBaseQty).toBe(1800);

    const item = await getInventoryItem(db(f), BEANS);
    expect(item!.stockBaseQty).toBe(1800);
    expect(item!.stockValueFils).toBe(5400); // 1800 x 3
  });

  it("refuses to edit a voided count", async () => {
    const f = seed();
    await reviewCount(db(f), "c1", "reject", "owner-1");

    await expect(
      editCount(
        db(f),
        "c1",
        { items: [{ inventoryItemId: MILK, countedStockQty: 3 }] },
        "owner-1",
      ),
    ).rejects.toThrow("Only pending or approved counts can be edited");
  });
});
