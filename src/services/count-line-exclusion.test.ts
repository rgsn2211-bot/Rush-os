import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import {
  reviewCount,
  editCount,
  excludeCountLine,
  restoreCountLine,
  voidApprovedCount,
  getCountWithItems,
} from "@/services/inventory-count";
import { getLossesReport } from "@/services/losses";
import { getCountReport } from "@/services/count-report";
import { listUsageBySource } from "@/repositories/inventory-usage";
import { getInventoryItem } from "@/repositories/inventory-items";
import { monthBoundsOf } from "@/lib/dates";

const db = (f: FakeDb) => f as unknown as SupabaseClient;

const MILK = "11111111-1111-4111-8111-111111111111";
const BEANS = "22222222-2222-4222-8222-222222222222";

const JULY = monthBoundsOf("2026-07-15");

/**
 * Milk 10 000 ml on hand at 0.2 fils/ml, counted at 8 L → a 2 000 ml SHORTAGE
 * worth 400 fils. Beans 2 000 g at 3 fils/g, counted at 2.5 kg → a 500 g
 * OVERAGE worth 1 500 fils, which books a phantom gain: the owner's real case.
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
        stock_base_qty: 10000,
        stock_value_fils: 2000,
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
        counted_at: "2026-07-31T08:00:00Z",
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
        expected_base_qty: 10000,
        counted_base_qty: 8000,
        variance_base_qty: -2000,
        value_fils: 0,
        created_at: "2026-07-31T08:00:00Z",
      },
      {
        id: "l2",
        count_id: "c1",
        inventory_item_id: BEANS,
        expected_base_qty: 2000,
        counted_base_qty: 2500,
        variance_base_qty: 500,
        value_fils: 0,
        created_at: "2026-07-31T08:01:00Z",
      },
    ],
    inventory_usage: [],
    complimentary_logs: [],
    balance_adjustments: [],
    profiles: [{ id: "worker-1", display_name: "Sara" }],
  });
}

async function approved(): Promise<FakeDb> {
  const f = seed();
  await reviewCount(db(f), "c1", "approve", "owner-1");
  return f;
}

describe("excluding a line but keeping its stock", () => {
  it("leaves the stock as counted and takes the variance out of Losses", async () => {
    const f = await approved();

    // The beans overage booked a 1 500 fils gain (a negative loss).
    const before = await getLossesReport(db(f), JULY);
    expect(before.countShrinkFils).toBe(400 - 1500);

    await excludeCountLine(db(f), "c1", BEANS, { revertStock: false }, "owner-1");

    // Stock still holds the counted 2 500 g — the shop really has the goods.
    const beans = await getInventoryItem(db(f), BEANS);
    expect(beans!.stockBaseQty).toBe(2500);
    expect(beans!.stockValueFils).toBe(7500);

    // Only the milk shortage is left in the loss numbers.
    const after = await getLossesReport(db(f), JULY);
    expect(after.countShrinkFils).toBe(400);

    // And the line's ledger row is gone, which is why every report agrees.
    const rows = await listUsageBySource(db(f), "count", "c1");
    expect(rows.map((r) => r.inventoryItemId)).toEqual([MILK]);
  });

  it("marks the line excluded and records that stock was kept", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", BEANS, { revertStock: false }, "owner-1");

    const count = await getCountWithItems(db(f), "c1");
    const line = count!.items.find((l) => l.inventoryItemId === BEANS)!;
    expect(line.excludedAt).not.toBeNull();
    expect(line.excludedBy).toBe("owner-1");
    expect(line.excludedKeptStock).toBe(true);

    // The other line is untouched.
    const milk = count!.items.find((l) => l.inventoryItemId === MILK)!;
    expect(milk.excludedAt).toBeNull();
  });
});

describe("excluding a line and reverting its stock", () => {
  it("returns the item to its pre-count quantity and value", async () => {
    const f = await approved();
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(8000);

    await excludeCountLine(db(f), "c1", MILK, { revertStock: true }, "owner-1");

    const milk = await getInventoryItem(db(f), MILK);
    expect(milk!.stockBaseQty).toBe(10000);
    expect(milk!.stockValueFils).toBe(2000);

    const report = await getLossesReport(db(f), JULY);
    expect(report.countShrinkFils).toBe(-1500); // only the beans overage left
  });

  it("records that the stock was reverted", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", MILK, { revertStock: true }, "owner-1");

    const count = await getCountWithItems(db(f), "c1");
    const line = count!.items.find((l) => l.inventoryItemId === MILK)!;
    expect(line.excludedKeptStock).toBe(false);
  });
});

describe("restoring an excluded line", () => {
  it("re-applies it and brings its variance back", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", BEANS, { revertStock: false }, "owner-1");
    expect((await getLossesReport(db(f), JULY)).countShrinkFils).toBe(400);

    await restoreCountLine(db(f), "c1", BEANS);

    const count = await getCountWithItems(db(f), "c1");
    const line = count!.items.find((l) => l.inventoryItemId === BEANS)!;
    expect(line.excludedAt).toBeNull();
    expect(line.excludedKeptStock).toBeNull();

    // Stock was already at the counted amount, so restoring finds no live
    // variance and books nothing — the reports simply stop hiding the line.
    expect((await getInventoryItem(db(f), BEANS))!.stockBaseQty).toBe(2500);
  });

  it("reconciles from wherever stock is now when the stock was reverted", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", MILK, { revertStock: true }, "owner-1");
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(10000);

    await restoreCountLine(db(f), "c1", MILK);

    // Reconciliation is an absolute set, so it lands back on the counted 8 L
    // and the shortage reappears.
    const milk = await getInventoryItem(db(f), MILK);
    expect(milk!.stockBaseQty).toBe(8000);
    expect(milk!.stockValueFils).toBe(1600);

    const rows = await listUsageBySource(db(f), "count", "c1");
    const milkRow = rows.find((r) => r.inventoryItemId === MILK)!;
    expect(milkRow.qtyBase).toBe(2000);
    expect(milkRow.cogsFils).toBe(400);
    expect(milkRow.occurredOn).toBe("2026-07-31"); // business date preserved
  });
});

describe("exclusion survives other operations", () => {
  it("is preserved when the count is edited", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", BEANS, { revertStock: false }, "owner-1");

    // Correcting the milk line must not drag the beans line back in.
    await editCount(
      db(f),
      "c1",
      {
        items: [
          { inventoryItemId: MILK, countedStockQty: 7 },
          { inventoryItemId: BEANS, countedStockQty: 2.5 },
        ],
      },
      "owner-1",
    );

    const count = await getCountWithItems(db(f), "c1");
    const beans = count!.items.find((l) => l.inventoryItemId === BEANS)!;
    expect(beans.excludedAt).not.toBeNull();

    const rows = await listUsageBySource(db(f), "count", "c1");
    expect(rows.map((r) => r.inventoryItemId)).toEqual([MILK]);
    expect((await getLossesReport(db(f), JULY)).countShrinkFils).toBe(600);
  });

  it("is not double-reverted by a later whole-count void", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", MILK, { revertStock: true }, "owner-1");
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(10000);

    await voidApprovedCount(db(f), "c1", "owner-1");

    // Milk was already put back and has no ledger row, so it stays put; beans
    // is reverted by the void.
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(10000);
    expect((await getInventoryItem(db(f), BEANS))!.stockBaseQty).toBe(2000);
  });

  it("leaves stock alone on a void when the line was excluded keeping stock", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", BEANS, { revertStock: false }, "owner-1");

    await voidApprovedCount(db(f), "c1", "owner-1");

    // The owner chose to keep this stock, and no ledger row remains to undo
    // it — so the void cannot and does not touch it.
    expect((await getInventoryItem(db(f), BEANS))!.stockBaseQty).toBe(2500);
    expect((await getInventoryItem(db(f), MILK))!.stockBaseQty).toBe(10000);
  });
});

describe("count report", () => {
  it("omits an excluded line from the totals but still lists it", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", BEANS, { revertStock: false }, "owner-1");

    const report = await getCountReport(db(f), JULY);
    const session = report.sessions[0];

    expect(report.totalNetValueFils).toBe(-400); // beans gain excluded
    expect(report.repeatOffenders.map((o) => o.name)).toEqual(["Milk"]);

    const beans = session.lines.find((l) => l.name === "Beans")!;
    expect(beans.excluded).toBe(true);
    expect(beans.excludedKeptStock).toBe(true);
  });
});

describe("guards", () => {
  it("refuses to exclude a line of a pending count", async () => {
    const f = seed();

    await expect(
      excludeCountLine(db(f), "c1", MILK, { revertStock: false }, "owner-1"),
    ).rejects.toThrow("Only lines of an approved count can be excluded");
  });

  it("refuses to exclude the same line twice", async () => {
    const f = await approved();
    await excludeCountLine(db(f), "c1", MILK, { revertStock: false }, "owner-1");

    await expect(
      excludeCountLine(db(f), "c1", MILK, { revertStock: false }, "owner-1"),
    ).rejects.toThrow("already excluded");
  });

  it("refuses to restore a line that is not excluded", async () => {
    const f = await approved();

    await expect(restoreCountLine(db(f), "c1", MILK)).rejects.toThrow(
      "not excluded",
    );
  });

  it("refuses an item that is not on the count", async () => {
    const f = await approved();

    await expect(
      restoreCountLine(db(f), "c1", "99999999-9999-4999-8999-999999999999"),
    ).rejects.toThrow("not on this count");
  });
});
