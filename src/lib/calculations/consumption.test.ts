import { describe, it, expect } from "vitest";
import { computeItemInsight } from "./consumption";

const TODAY = "2026-07-28";

const base = {
  today: TODAY,
  stockBaseQty: 7000,
  leadTimeDays: 3,
  safetyDays: 2,
  unitsPerPurchase: 12,
  basePerStock: 1000,
};

describe("computeItemInsight", () => {
  it("computes 7/30-day rates and days-to-stockout from the recent rate", () => {
    // 1000/day for the last 7 days, nothing before.
    const events = Array.from({ length: 7 }, (_, i) => ({
      occurredOn: `2026-07-${22 + i}`,
      qtyBase: 1000,
      cogsFils: 500,
    }));
    const r = computeItemInsight({ ...base, events });

    expect(r.qty7).toBe(7000);
    expect(r.qty30).toBe(7000);
    expect(r.ratePerDay7).toBe(1000);
    expect(r.daysToStockout).toBe(7);
    expect(r.stockoutDate).toBe("2026-08-04");
    // 7 days left > lead(3)+safety(2) -> no reorder yet.
    expect(r.reorder).toBe(false);
  });

  it("flags reorder and suggests whole purchase units when stock won't outlast lead time", () => {
    const events = Array.from({ length: 7 }, (_, i) => ({
      occurredOn: `2026-07-${22 + i}`,
      qtyBase: 1000,
      cogsFils: 500,
    }));
    // Only 4 days of stock left at 1000/day.
    const r = computeItemInsight({ ...base, stockBaseQty: 4000, events });

    expect(r.daysToStockout).toBe(4);
    expect(r.reorder).toBe(true);
    // Need (3+2+7) x 1000 − 4000 = 8000 base units; 12000 per purchase unit
    // -> 1 unit, rounded up.
    expect(r.suggestedPurchaseUnits).toBe(1);
  });

  it("falls back to the 30-day rate when the last week was quiet", () => {
    // Usage only 2-4 weeks ago.
    const events = Array.from({ length: 15 }, (_, i) => ({
      occurredOn: `2026-07-${String(1 + i).padStart(2, "0")}`,
      qtyBase: 600,
      cogsFils: 300,
    }));
    const r = computeItemInsight({ ...base, stockBaseQty: 900, events });

    expect(r.qty7).toBe(0);
    expect(r.ratePerDay30).toBe(300); // 9000 / 30
    expect(r.daysToStockout).toBe(3); // 900 / 300
    expect(r.reorder).toBe(true);
  });

  it("returns null stockout with zero consumption, and 'out now' at negative stock", () => {
    const idle = computeItemInsight({ ...base, events: [] });
    expect(idle.daysToStockout).toBeNull();
    expect(idle.stockoutDate).toBeNull();
    expect(idle.reorder).toBe(false);

    const out = computeItemInsight({ ...base, stockBaseQty: -500, events: [] });
    expect(out.daysToStockout).toBe(0);
    expect(out.reorder).toBe(true);
  });

  it("negative on-hand increases the suggested order", () => {
    const events = Array.from({ length: 7 }, (_, i) => ({
      occurredOn: `2026-07-${22 + i}`,
      qtyBase: 1000,
      cogsFils: 500,
    }));
    const r = computeItemInsight({ ...base, stockBaseQty: -2000, events });

    // Need 12000 + the 2000 hole = 14000 -> 2 purchase units of 12000.
    expect(r.suggestedPurchaseUnits).toBe(2);
  });

  it("ignores events outside the trailing 30 days and clamps restorations", () => {
    const r = computeItemInsight({
      ...base,
      events: [
        { occurredOn: "2026-06-01", qtyBase: 99999, cogsFils: 1 }, // too old
        { occurredOn: "2026-07-27", qtyBase: 500, cogsFils: 250 },
        { occurredOn: "2026-07-27", qtyBase: -800, cogsFils: -400 }, // restoration
      ],
    });
    expect(r.qty7).toBe(0); // net negative clamped to 0
    expect(r.qty30).toBe(0);
  });
});
