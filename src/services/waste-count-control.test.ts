import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { reviewWaste, voidApprovedWaste } from "@/services/waste";
import {
  reviewCount,
  voidApprovedCount,
  deleteCountAsOwner,
} from "@/services/inventory-count";

const OWNER = "owner-1";
const ITEM = "00000000-0000-0000-0000-0000000000i1";
const db = (f: FakeDb) => f as unknown as SupabaseClient;

function item(over: Record<string, unknown> = {}) {
  return {
    id: ITEM,
    name: "Beans",
    base_unit: "g",
    stock_unit: "kg",
    base_per_stock: 1000,
    purchase_unit: "bag",
    units_per_purchase: 5,
    expiry: "optional",
    tracks_open: false,
    min_base_qty: 0,
    safety_days: 0,
    stock_base_qty: 1000,
    stock_value_fils: 16000, // avg 16
    last_unit_cost_fils: 16,
    default_cost_fils: 16,
    costing_method: "weighted_average",
    status: "approved",
    ...over,
  };
}

describe("voidApprovedWaste", () => {
  it("restores the exact consumed stock and value, and clears the ledger", async () => {
    const f = makeFakeDb({
      inventory_items: [item()],
      waste_logs: [
        {
          id: "w1",
          inventory_item_id: ITEM,
          base_qty: 200,
          value_fils: 0,
          consumed_base_qty: null,
          reason: "spoilage",
          occurred_at: new Date().toISOString(),
          status: "needs_review",
          created_by: "worker-1",
        },
      ],
    });

    await reviewWaste(db(f), "w1", "approve", OWNER);
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(800);
    expect(f.tables.inventory_items[0].stock_value_fils).toBe(12800);

    await voidApprovedWaste(db(f), "w1", OWNER);

    expect(f.tables.inventory_items[0].stock_base_qty).toBe(1000);
    expect(f.tables.inventory_items[0].stock_value_fils).toBe(16000);
    expect(f.tables.inventory_usage).toHaveLength(0);
    expect(f.tables.waste_logs[0].status).toBe("voided");
  });

  it("restores correctly even onto stock that has since gone negative", async () => {
    const f = makeFakeDb({
      inventory_items: [item({ stock_base_qty: 100, stock_value_fils: 1600 })],
      waste_logs: [
        {
          id: "w1",
          inventory_item_id: ITEM,
          base_qty: 250, // more than on hand -> negative after approval
          value_fils: 0,
          consumed_base_qty: null,
          reason: "spoilage",
          occurred_at: new Date().toISOString(),
          status: "needs_review",
          created_by: "worker-1",
        },
      ],
    });

    await reviewWaste(db(f), "w1", "approve", OWNER);
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(-150);

    await voidApprovedWaste(db(f), "w1", OWNER);
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(100);
    expect(f.tables.inventory_items[0].stock_value_fils).toBe(1600);
  });

  it("refuses to void pending or already-voided entries", async () => {
    const f = makeFakeDb({
      inventory_items: [item()],
      waste_logs: [
        {
          id: "w1",
          inventory_item_id: ITEM,
          base_qty: 100,
          value_fils: 0,
          reason: "spoilage",
          occurred_at: new Date().toISOString(),
          status: "needs_review",
          created_by: "worker-1",
        },
      ],
    });

    await expect(voidApprovedWaste(db(f), "w1", OWNER)).rejects.toThrow(
      /Only approved/,
    );
  });
});

function seedCount(counted: number): FakeDb {
  return makeFakeDb({
    inventory_items: [item()],
    inventory_counts: [
      {
        id: "cnt1",
        notes: null,
        counted_at: new Date().toISOString(),
        status: "needs_review",
        created_by: "worker-1",
      },
    ],
    inventory_count_items: [
      {
        id: "ci1",
        count_id: "cnt1",
        inventory_item_id: ITEM,
        expected_base_qty: 1000,
        counted_base_qty: counted,
        variance_base_qty: counted - 1000,
        value_fils: 0,
      },
    ],
  });
}

describe("owner count control", () => {
  it("remove-record deletes the count and its ledger rows but keeps the stock", async () => {
    const f = seedCount(900); // 100 g shrinkage
    await reviewCount(db(f), "cnt1", "approve", OWNER);
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(900);
    expect(f.tables.inventory_usage).toHaveLength(1);

    await deleteCountAsOwner(db(f), "cnt1");

    expect(f.tables.inventory_counts).toHaveLength(0);
    expect(f.tables.inventory_usage).toHaveLength(0);
    // Stock keeps the adjustment the count made.
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(900);
  });

  it("void-and-revert restores each item's pre-count stock and value", async () => {
    const f = seedCount(900);
    await reviewCount(db(f), "cnt1", "approve", OWNER);
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(900);
    expect(f.tables.inventory_items[0].stock_value_fils).toBe(14400); // 900 x 16

    await voidApprovedCount(db(f), "cnt1", OWNER);

    expect(f.tables.inventory_items[0].stock_base_qty).toBe(1000);
    expect(f.tables.inventory_items[0].stock_value_fils).toBe(16000);
    expect(f.tables.inventory_usage).toHaveLength(0);
    expect(f.tables.inventory_counts[0].status).toBe("voided");
  });

  it("void refuses non-approved counts", async () => {
    const f = seedCount(900);
    await expect(voidApprovedCount(db(f), "cnt1", OWNER)).rejects.toThrow(
      /Only approved/,
    );
  });
});
