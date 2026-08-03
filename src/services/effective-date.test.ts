import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { reviewCount, submitCount } from "@/services/inventory-count";
import { reviewWaste, logWaste } from "@/services/waste";
import { getLossesReport } from "@/services/losses";
import { monthBoundsOf } from "@/lib/dates";
import { listUsageBySource } from "@/repositories/inventory-usage";

const db = (f: FakeDb) => f as unknown as SupabaseClient;

const MILK = "11111111-1111-4111-8111-111111111111";

const MILK_ITEM = {
  id: MILK,
  name: "Milk",
  category: null,
  base_unit: "ml",
  stock_unit: "L",
  base_per_stock: 1000,
  purchase_unit: "case",
  units_per_purchase: 12,
  expiry: "not_needed",
  tracks_open: false,
  min_base_qty: 0,
  max_base_qty: null,
  safety_days: 2,
  supplier_id: null,
  stock_base_qty: 4000,
  stock_value_fils: 800,
  default_cost_fils: 0.2,
  costing_method: "weighted_average",
  status: "approved",
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
};

function seed(extra: Record<string, Record<string, unknown>[]> = {}): FakeDb {
  return makeFakeDb({
    inventory_items: [{ ...MILK_ITEM }],
    inventory_items_worker: [{ ...MILK_ITEM }],
    inventory_counts: [],
    inventory_count_items: [],
    waste_logs: [],
    inventory_usage: [],
    complimentary_logs: [],
    balance_adjustments: [],
    profiles: [{ id: "worker-1", display_name: "Sara" }],
    ...extra,
  });
}

const JULY = monthBoundsOf("2026-07-15");
const AUGUST = monthBoundsOf("2026-08-15");

describe("counts report their loss on the business date, not the approval date", () => {
  it("books a July count approved in August into July", async () => {
    const f = seed();

    // The shelves are counted on 2 August for the July close.
    const count = await submitCount(
      db(f),
      {
        effectiveOn: "2026-07-31",
        items: [{ inventoryItemId: MILK, countedStockQty: 3 }],
      },
      "worker-1",
    );
    await reviewCount(db(f), count.id, "approve", "owner-1");

    const rows = await listUsageBySource(db(f), "count", count.id);
    expect(rows[0].occurredOn).toBe("2026-07-31");

    const july = await getLossesReport(db(f), JULY);
    const august = await getLossesReport(db(f), AUGUST);

    expect(july.countShrinkFils).toBe(200); // 1000 ml x 0.2
    expect(august.countShrinkFils).toBe(0);
  });

  it("falls back to today in Bahrain when no date is given", async () => {
    const f = seed();

    const count = await submitCount(
      db(f),
      { items: [{ inventoryItemId: MILK, countedStockQty: 3 }] },
      "worker-1",
    );
    await reviewCount(db(f), count.id, "approve", "owner-1");

    const rows = await listUsageBySource(db(f), "count", count.id);
    expect(rows[0].occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("waste reports its loss on the business date", () => {
  it("books waste discovered late into the month it belongs to", async () => {
    const f = seed();

    const log = await logWaste(
      db(f),
      {
        inventoryItemId: MILK,
        stockQty: 1,
        reason: "spoilage",
        effectiveOn: "2026-07-20",
      },
      "worker-1",
    );
    await reviewWaste(db(f), log.id, "approve", "owner-1");

    const rows = await listUsageBySource(db(f), "waste", log.id);
    expect(rows[0].occurredOn).toBe("2026-07-20");

    const july = await getLossesReport(db(f), JULY);
    const august = await getLossesReport(db(f), AUGUST);

    expect(july.wasteFils).toBe(200);
    expect(august.wasteFils).toBe(0);
  });
});
