import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { getUsageReport } from "@/services/usage-report";
import { getCountReport } from "@/services/count-report";
import { getOwnerAlerts, getWorkerAlerts } from "@/services/alerts";
import { reclassifyUsage } from "@/services/loss-adjustments";
import { monthBoundsOf, todayInBahrain } from "@/lib/dates";

const db = (f: FakeDb) => f as unknown as SupabaseClient;

const MILK = "11111111-1111-4111-8111-111111111111";
const NAPKIN = "33333333-3333-4333-8333-333333333333";

const JULY = monthBoundsOf("2026-07-15");

function item(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    name,
    category: null,
    base_unit: "pc",
    stock_unit: "pack",
    base_per_stock: 100,
    purchase_unit: "box",
    units_per_purchase: 10,
    expiry: "not_needed",
    tracks_open: false,
    min_base_qty: 0,
    max_base_qty: null,
    safety_days: 2,
    supplier_id: null,
    stock_base_qty: 5000,
    stock_value_fils: 5000,
    default_cost_fils: 1,
    costing_method: "weighted_average",
    status: "approved",
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

function usage(
  id: string,
  itemId: string,
  usageClass: string,
  cogsFils: number,
  occurredOn: string,
  sourceType = "pos_import",
) {
  return {
    id,
    occurred_on: occurredOn,
    source_type: sourceType,
    source_id: `src-${id}`,
    inventory_item_id: itemId,
    qty_base: cogsFils,
    cogs_fils: cogsFils,
    usage_class: usageClass,
  };
}

describe("getUsageReport", () => {
  /** Milk: 9000 sold, 500 wasted, 500 shrinkage -> 10% waste rate. */
  function seed(occurredOn = "2026-07-10"): FakeDb {
    return makeFakeDb({
      inventory_items: [item(MILK, "Milk"), item(NAPKIN, "Napkins")],
      inventory_usage: [
        usage("u1", MILK, "sold", 9000, occurredOn),
        usage("u2", MILK, "wasted", 500, occurredOn, "waste"),
        usage("u3", MILK, "shrinkage", 500, occurredOn, "count"),
        usage("u4", NAPKIN, "sold", 9800, occurredOn),
        usage("u5", NAPKIN, "wasted", 200, occurredOn, "waste"),
      ],
    });
  }

  it("reports each item's waste share of what it consumed", async () => {
    const report = await getUsageReport(db(seed()), JULY);

    const milk = report.items.find((i) => i.inventoryItemId === MILK)!;
    expect(milk.mix.totalConsumedFils).toBe(10000);
    expect(milk.mix.wasteRatePct).toBe(10);
    expect(milk.lostFils).toBe(1000);

    const napkins = report.items.find((i) => i.inventoryItemId === NAPKIN)!;
    expect(napkins.mix.wasteRatePct).toBe(2);
  });

  it("flags only the items above the 5% threshold", async () => {
    const report = await getUsageReport(db(seed()), JULY);

    expect(report.highWasteItems.map((i) => i.inventoryItemId)).toEqual([MILK]);
  });

  it("sorts the worst losses first", async () => {
    const report = await getUsageReport(db(seed()), JULY);
    expect(report.items[0].inventoryItemId).toBe(MILK);
  });

  it("gives a shop-wide mix across every item", async () => {
    const report = await getUsageReport(db(seed()), JULY);

    expect(report.total.totalConsumedFils).toBe(20000);
    expect(report.total.wasteRatePct).toBe(6); // 1200 of 20000
  });

  it("only counts rows whose business date falls in the period", async () => {
    const report = await getUsageReport(db(seed("2026-08-10")), JULY);
    expect(report.items).toHaveLength(0);
    expect(report.total.totalConsumedFils).toBe(0);
  });

  it("stops counting a loss the owner adjusted to ordinary usage", async () => {
    const f = seed();

    await reclassifyUsage(db(f), { usageId: "u2", toClass: "used" }, "owner-1");
    await reclassifyUsage(db(f), { usageId: "u3", toClass: "used" }, "owner-1");

    const report = await getUsageReport(db(f), JULY);
    const milk = report.items.find((i) => i.inventoryItemId === MILK)!;

    expect(milk.mix.wasteRatePct).toBe(0);
    expect(milk.mix.pct.used).toBe(10);
    expect(report.highWasteItems).toHaveLength(0);
  });
});

describe("high-waste alerts", () => {
  function seedToday(): FakeDb {
    const today = todayInBahrain();
    return makeFakeDb({
      inventory_items: [item(MILK, "Milk"), item(NAPKIN, "Napkins")],
      inventory_items_worker: [item(MILK, "Milk"), item(NAPKIN, "Napkins")],
      inventory_usage: [
        usage("u1", MILK, "sold", 9000, today),
        usage("u2", MILK, "wasted", 1000, today, "waste"),
        usage("u4", NAPKIN, "sold", 9900, today),
        usage("u5", NAPKIN, "wasted", 100, today, "waste"),
      ],
      purchases: [],
      purchase_items: [],
    });
  }

  it("raises an alert for the item over the threshold and not the one under", async () => {
    const alerts = await getOwnerAlerts(db(seedToday()));
    const waste = alerts.filter((a) => a.type === "high_waste");

    expect(waste).toHaveLength(1);
    expect(waste[0].title).toContain("Milk");
    expect(waste[0].detail).toContain("10.0%");
    expect(waste[0].link).toContain(`/owner/losses/${MILK}`);
  });

  it("suppresses low-volume items whose percentage is meaningless", async () => {
    const today = todayInBahrain();
    const f = makeFakeDb({
      inventory_items: [item(NAPKIN, "Napkins")],
      inventory_usage: [usage("u1", NAPKIN, "wasted", 50, today, "waste")],
      purchases: [],
      purchase_items: [],
    });

    const alerts = await getOwnerAlerts(db(f));
    expect(alerts.filter((a) => a.type === "high_waste")).toHaveLength(0);
  });

  it("never shows workers a waste rate — it is financial data", async () => {
    const alerts = await getWorkerAlerts(db(seedToday()));

    // WorkerAlert's type union has no high_waste member (the compiler enforces
    // that); this guards the message text too, since the rate is money data.
    const types = alerts.map((a) => a.type as string);
    expect(types).not.toContain("high_waste");
    expect(alerts.every((a) => !/%/.test(a.detail))).toBe(true);
  });
});

describe("getCountReport", () => {
  function seed(): FakeDb {
    return makeFakeDb({
      inventory_items: [item(MILK, "Milk"), item(NAPKIN, "Napkins")],
      inventory_counts: [
        {
          id: "c1",
          counted_at: "2026-07-15T08:00:00Z",
          effective_on: "2026-07-15",
          status: "approved",
          created_by: "worker-1",
        },
        {
          id: "c2",
          counted_at: "2026-08-01T08:00:00Z",
          effective_on: "2026-07-31",
          status: "approved",
          created_by: "worker-1",
        },
        {
          id: "c3",
          counted_at: "2026-08-05T08:00:00Z",
          effective_on: "2026-08-05",
          status: "approved",
          created_by: "worker-1",
        },
      ],
      inventory_count_items: [
        {
          id: "l1",
          count_id: "c1",
          inventory_item_id: MILK,
          expected_base_qty: 5000,
          counted_base_qty: 4800,
          variance_base_qty: -200,
          value_fils: -200,
        },
        {
          id: "l2",
          count_id: "c1",
          inventory_item_id: NAPKIN,
          expected_base_qty: 1000,
          counted_base_qty: 1000,
          variance_base_qty: 0,
          value_fils: 0,
        },
        {
          id: "l3",
          count_id: "c2",
          inventory_item_id: MILK,
          expected_base_qty: 4800,
          counted_base_qty: 4500,
          variance_base_qty: -300,
          value_fils: -300,
        },
        {
          id: "l4",
          count_id: "c3",
          inventory_item_id: MILK,
          expected_base_qty: 4500,
          counted_base_qty: 4000,
          variance_base_qty: -500,
          value_fils: -500,
        },
      ],
    });
  }

  it("includes counts by their business date, not the day they were taken", async () => {
    const report = await getCountReport(db(seed()), JULY);

    // c2 was counted in August but applies to July; c3 is August's own.
    expect(report.sessions.map((s) => s.id).sort()).toEqual(["c1", "c2"]);
  });

  it("lists only the lines that actually differed", async () => {
    const report = await getCountReport(db(seed()), JULY);
    const c1 = report.sessions.find((s) => s.id === "c1")!;

    expect(c1.itemCount).toBe(2);
    expect(c1.lines).toHaveLength(1);
    expect(c1.lines[0].name).toBe("Milk");
  });

  it("adds each item up across the period's counts", async () => {
    const report = await getCountReport(db(seed()), JULY);

    expect(report.repeatOffenders).toHaveLength(1);
    expect(report.repeatOffenders[0].name).toBe("Milk");
    expect(report.repeatOffenders[0].countsWithVariance).toBe(2);
    expect(report.repeatOffenders[0].varianceBaseQty).toBe(-500);
    expect(report.repeatOffenders[0].valueFils).toBe(-500);
    expect(report.totalNetValueFils).toBe(-500);
  });
});
