import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { reviewWaste, editWaste, getWasteDetails } from "@/services/waste";
import { reclassifyUsage } from "@/services/loss-adjustments";
import { listUsageBySource } from "@/repositories/inventory-usage";
import { getInventoryItem } from "@/repositories/inventory-items";

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
  stock_base_qty: 10000,
  stock_value_fils: 2000, // 0.2 fils/ml
  last_unit_cost_fils: 0.2,
  default_cost_fils: 0.2,
  costing_method: "weighted_average",
  status: "approved",
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
};

/** 2 L of milk logged as spoiled, pending review. */
function seed(): FakeDb {
  return makeFakeDb({
    inventory_items: [{ ...MILK_ITEM }],
    inventory_items_worker: [{ ...MILK_ITEM }],
    waste_logs: [
      {
        id: "w1",
        inventory_item_id: MILK,
        base_qty: 2000,
        value_fils: 0,
        consumed_base_qty: null,
        reason: "spoilage",
        notes: null,
        occurred_at: "2026-07-10T08:00:00Z",
        effective_on: "2026-07-10",
        status: "needs_review",
        created_by: "worker-1",
      },
    ],
    inventory_usage: [],
    profiles: [{ id: "worker-1", display_name: "Sara" }],
  });
}

describe("editing a pending waste entry", () => {
  it("changes the stored values without touching stock", async () => {
    const f = seed();

    await editWaste(db(f), "w1", { stockQty: 1.5, reason: "expired" }, "owner-1");

    const item = await getInventoryItem(db(f), MILK);
    expect(item!.stockBaseQty).toBe(10000);

    const log = await getWasteDetails(db(f), "w1");
    expect(log!.baseQty).toBe(1500);
    expect(log!.reason).toBe("expired");
    expect(log!.status).toBe("needs_review");
  });
});

describe("editing an approved waste entry", () => {
  it("re-adjusts stock and the recorded loss to the corrected quantity", async () => {
    const f = seed();
    await reviewWaste(db(f), "w1", "approve", "owner-1");

    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(8000);
    expect((await getWasteDetails(db(f), "w1"))!.valueFils).toBe(400);

    // It was really 3 L, not 2.
    await editWaste(db(f), "w1", { stockQty: 3 }, "owner-1");

    const item = await getInventoryItem(db(f), MILK);
    expect(item!.stockBaseQty).toBe(7000);
    expect(item!.stockValueFils).toBe(1400); // average preserved at 0.2

    const log = await getWasteDetails(db(f), "w1");
    expect(log!.baseQty).toBe(3000);
    expect(log!.valueFils).toBe(600);

    const rows = await listUsageBySource(db(f), "waste", "w1");
    expect(rows).toHaveLength(1); // replaced, not duplicated
    expect(rows[0].qtyBase).toBe(3000);
    expect(rows[0].cogsFils).toBe(600);
  });

  it("re-dates the loss when the effective date changes", async () => {
    const f = seed();
    await reviewWaste(db(f), "w1", "approve", "owner-1");

    await editWaste(db(f), "w1", { effectiveOn: "2026-06-30" }, "owner-1");

    const rows = await listUsageBySource(db(f), "waste", "w1");
    expect(rows[0].occurredOn).toBe("2026-06-30");
    // Quantity untouched, so stock is where the approval left it.
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(8000);
  });

  it("keeps an adjustment to ordinary usage across the edit", async () => {
    const f = seed();
    await reviewWaste(db(f), "w1", "approve", "owner-1");

    const row = (await listUsageBySource(db(f), "waste", "w1"))[0];
    await reclassifyUsage(db(f), { usageId: row.id, toClass: "used" }, "owner-1");

    await editWaste(db(f), "w1", { stockQty: 3 }, "owner-1");

    const rows = await listUsageBySource(db(f), "waste", "w1");
    expect(rows).toHaveLength(1);
    // Correcting the quantity must not silently turn this back into "wasted".
    expect(rows[0].usageClass).toBe("used");
    expect(rows[0].qtyBase).toBe(3000);
  });

  it("refuses to edit a voided entry", async () => {
    const f = seed();
    await reviewWaste(db(f), "w1", "reject", "owner-1");

    await expect(
      editWaste(db(f), "w1", { stockQty: 1 }, "owner-1"),
    ).rejects.toThrow("Only pending or approved waste can be edited");
  });
});
