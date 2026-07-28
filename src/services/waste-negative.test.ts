import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { reviewWaste } from "@/services/waste";

const ITEM = "00000000-0000-0000-0000-0000000000i1";
const LOG = "00000000-0000-0000-0000-0000000000w1";

function seedDb(opts: { stockQty: number; stockValue: number; wasteQty: number }): FakeDb {
  return makeFakeDb({
    inventory_items: [
      {
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
        stock_base_qty: opts.stockQty,
        stock_value_fils: opts.stockValue,
        last_unit_cost_fils: 0,
        default_cost_fils: 16,
        costing_method: "weighted_average",
        status: "approved",
      },
    ],
    waste_logs: [
      {
        id: LOG,
        inventory_item_id: ITEM,
        base_qty: opts.wasteQty,
        value_fils: 0,
        consumed_base_qty: null,
        reason: "spoilage",
        notes: null,
        occurred_at: new Date().toISOString(),
        status: "needs_review",
        created_by: "worker-1",
        reviewed_by: null,
        reviewed_at: null,
      },
    ],
  });
}

const asClient = (db: FakeDb) => db as unknown as SupabaseClient;

describe("reviewWaste with negative stock", () => {
  it("approves the full quantity even past on-hand, booking the whole loss", async () => {
    // 500 g on hand worth 8000 fils (avg 16); waste 800 g.
    const db = seedDb({ stockQty: 500, stockValue: 8000, wasteQty: 800 });
    await reviewWaste(asClient(db), LOG, "approve", "owner-1");

    const item = db.tables.inventory_items[0];
    expect(item.stock_base_qty).toBe(-300);
    expect(item.stock_value_fils).toBe(-4800); // 300 g at fallback 16

    const log = db.tables.waste_logs[0];
    expect(log.status).toBe("approved");
    expect(log.value_fils).toBe(8000 + 4800); // full loss, not clamped
    expect(log.consumed_base_qty).toBe(800);

    const usage = db.tables.inventory_usage;
    expect(usage).toHaveLength(1);
    expect(usage[0].source_type).toBe("waste");
    expect(usage[0].source_id).toBe(LOG);
    expect(usage[0].qty_base).toBe(800);
    expect(usage[0].cogs_fils).toBe(12800);
  });

  it("rejecting voids the log without touching stock or the ledger", async () => {
    const db = seedDb({ stockQty: 500, stockValue: 8000, wasteQty: 800 });
    await reviewWaste(asClient(db), LOG, "reject", "owner-1");

    expect(db.tables.inventory_items[0].stock_base_qty).toBe(500);
    expect(db.tables.waste_logs[0].status).toBe("voided");
    expect(db.tables.inventory_usage ?? []).toHaveLength(0);
  });
});
