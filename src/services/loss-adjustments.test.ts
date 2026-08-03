import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import {
  reclassifyUsage,
  revertReclassification,
} from "@/services/loss-adjustments";
import { getLossesReport } from "@/services/losses";
import { getProfitReport } from "@/services/profit";
import { listUsageBetween } from "@/repositories/inventory-usage";
import { getInventoryItem } from "@/repositories/inventory-items";
import { monthBoundsOf } from "@/lib/dates";

const db = (f: FakeDb) => f as unknown as SupabaseClient;

const NAPKIN = "33333333-3333-4333-8333-333333333333";
const SHRINK = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WASTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SOLD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const JULY = monthBoundsOf("2026-07-15");

/**
 * 1000 napkins missing at a count, costed at 900 fils, plus 100 wasted at
 * 90 fils and an unrelated POS sale.
 */
function seed(): FakeDb {
  return makeFakeDb({
    inventory_items: [
      {
        id: NAPKIN,
        name: "Napkins",
        base_unit: "pc",
        stock_unit: "pack",
        base_per_stock: 100,
        stock_base_qty: 5000,
        stock_value_fils: 4500,
        default_cost_fils: 0.9,
        costing_method: "weighted_average",
        status: "approved",
      },
    ],
    inventory_usage: [
      {
        id: SHRINK,
        occurred_on: "2026-07-31",
        source_type: "count",
        source_id: "c1",
        inventory_item_id: NAPKIN,
        qty_base: 1000,
        cogs_fils: 900,
        usage_class: "shrinkage",
      },
      {
        id: WASTE,
        occurred_on: "2026-07-10",
        source_type: "waste",
        source_id: "w1",
        inventory_item_id: NAPKIN,
        qty_base: 100,
        cogs_fils: 90,
        usage_class: "wasted",
      },
      {
        id: SOLD,
        occurred_on: "2026-07-05",
        source_type: "pos_import",
        source_id: "i1",
        inventory_item_id: NAPKIN,
        qty_base: 500,
        cogs_fils: 450,
        usage_class: "sold",
      },
    ],
    daily_closings: [],
    daily_closing_delivery: [],
    expenses: [],
    expense_lines: [],
    settlements: [],
    settlement_payments: [],
    cash_movements: [],
    complimentary_logs: [],
    balance_adjustments: [],
    pos_imports: [],
    delivery_platforms: [],
  });
}

describe("reclassifying a whole loss", () => {
  it("moves it out of losses and into operational usage", async () => {
    const f = seed();

    await reclassifyUsage(
      db(f),
      { usageId: SHRINK, toClass: "used", note: "Napkins on the counter" },
      "owner-1",
    );

    const report = await getLossesReport(db(f), JULY);
    expect(report.countShrinkFils).toBe(0);
    expect(report.operationalUsageFils).toBe(900);
    expect(report.wasteFils).toBe(90); // untouched
  });

  it("never touches stock", async () => {
    const f = seed();
    const before = await getInventoryItem(db(f), NAPKIN);

    await reclassifyUsage(db(f), { usageId: SHRINK, toClass: "used" }, "owner-1");

    const after = await getInventoryItem(db(f), NAPKIN);
    expect(after!.stockBaseQty).toBe(before!.stockBaseQty);
    expect(after!.stockValueFils).toBe(before!.stockValueFils);
  });

  it("never moves the date the consumption happened", async () => {
    const f = seed();

    await reclassifyUsage(db(f), { usageId: SHRINK, toClass: "sold" }, "owner-1");

    const rows = await listUsageBetween(db(f), "2026-07-01", "2026-08-01");
    expect(rows.find((r) => r.id === SHRINK)!.occurredOn).toBe("2026-07-31");
  });

  it("refuses to adjust a POS sale", async () => {
    const f = seed();

    await expect(
      reclassifyUsage(db(f), { usageId: SOLD, toClass: "used" }, "owner-1"),
    ).rejects.toThrow("Only waste and count shrinkage can be adjusted");
  });
});

describe("reclassifying part of a loss", () => {
  it("splits the record so the two halves sum exactly to the original", async () => {
    const f = seed();

    // 400 of the 1000 missing napkins were used at the counter.
    await reclassifyUsage(
      db(f),
      { usageId: SHRINK, toClass: "used", qtyBase: 400 },
      "owner-1",
    );

    const rows = (await listUsageBetween(db(f), "2026-07-01", "2026-08-01"))
      .filter((r) => r.sourceType === "count");

    expect(rows).toHaveLength(2);
    expect(rows.reduce((s, r) => s + r.qtyBase, 0)).toBe(1000);
    expect(rows.reduce((s, r) => s + r.cogsFils, 0)).toBe(900);

    const child = rows.find((r) => r.usageClass === "used")!;
    expect(child.qtyBase).toBe(400);
    expect(child.cogsFils).toBe(360);
    expect(child.reclassifiedFromId).toBe(SHRINK);

    const report = await getLossesReport(db(f), JULY);
    expect(report.countShrinkFils).toBe(540);
    expect(report.operationalUsageFils).toBe(360);
  });

  it("leaves the rounding remainder on the original so nothing is lost", async () => {
    const f = seed();

    // 333 of 1000 at 900 fils -> 299.7, rounds to 300; parent keeps 600.
    await reclassifyUsage(
      db(f),
      { usageId: SHRINK, toClass: "used", qtyBase: 333 },
      "owner-1",
    );

    const rows = (await listUsageBetween(db(f), "2026-07-01", "2026-08-01"))
      .filter((r) => r.sourceType === "count");

    expect(rows.reduce((s, r) => s + r.cogsFils, 0)).toBe(900);
    expect(rows.find((r) => r.usageClass === "used")!.cogsFils).toBe(300);
    expect(rows.find((r) => r.usageClass === "shrinkage")!.cogsFils).toBe(600);
  });

  it("rejects a quantity larger than the record", async () => {
    const f = seed();

    await expect(
      reclassifyUsage(
        db(f),
        { usageId: SHRINK, toClass: "used", qtyBase: 5000 },
        "owner-1",
      ),
    ).rejects.toThrow("more than this record covers");
  });
});

describe("undoing an adjustment", () => {
  it("restores the original class on a whole-record adjustment", async () => {
    const f = seed();
    await reclassifyUsage(db(f), { usageId: WASTE, toClass: "used" }, "owner-1");

    await revertReclassification(db(f), WASTE);

    const report = await getLossesReport(db(f), JULY);
    expect(report.wasteFils).toBe(90);
    expect(report.operationalUsageFils).toBe(0);
  });

  it("merges a split back into its parent", async () => {
    const f = seed();
    await reclassifyUsage(
      db(f),
      { usageId: SHRINK, toClass: "used", qtyBase: 400 },
      "owner-1",
    );

    const child = (await listUsageBetween(db(f), "2026-07-01", "2026-08-01"))
      .find((r) => r.usageClass === "used")!;

    await revertReclassification(db(f), child.id);

    const rows = (await listUsageBetween(db(f), "2026-07-01", "2026-08-01"))
      .filter((r) => r.sourceType === "count");

    expect(rows).toHaveLength(1);
    expect(rows[0].qtyBase).toBe(1000);
    expect(rows[0].cogsFils).toBe(900);

    const report = await getLossesReport(db(f), JULY);
    expect(report.countShrinkFils).toBe(900);
    expect(report.operationalUsageFils).toBe(0);
  });

  it("refuses to undo a record that was never adjusted", async () => {
    const f = seed();

    await expect(revertReclassification(db(f), WASTE)).rejects.toThrow(
      "has not been adjusted",
    );
  });
});

describe("profit is unaffected by reclassification", () => {
  it("reports the same net profit before and after", async () => {
    const f = seed();
    const before = await getProfitReport(db(f), JULY);

    await reclassifyUsage(
      db(f),
      { usageId: SHRINK, toClass: "used" },
      "owner-1",
    );
    const after = await getProfitReport(db(f), JULY);

    // The napkins really were consumed either way — only the label changed.
    expect(after.summary.netProfitFils).toBe(before.summary.netProfitFils);
    expect(after.losses.totalFils).toBe(before.losses.totalFils);
  });
});
