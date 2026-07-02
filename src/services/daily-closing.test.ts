import { describe, it, expect } from "vitest";
import { computeClosingFigures } from "./daily-closing";
import type { DailyClosingUpdateInput } from "@/lib/validators/closing";

function figures(
  over: Partial<DailyClosingUpdateInput> = {},
): DailyClosingUpdateInput {
  return {
    discountBhd: 0,
    cashSalesBhd: 0,
    cashOrders: 0,
    cardSalesBhd: 0,
    cardOrders: 0,
    benefitpaySalesBhd: 0,
    benefitpayOrders: 0,
    deliveryLines: [],
    cashCountedBhd: 0,
    ...over,
  };
}

describe("computeClosingFigures", () => {
  it("converts BHD figures to fils and sums gross sales + orders", () => {
    const f = computeClosingFigures(
      figures({
        cashSalesBhd: 10, // 10000
        cashOrders: 4,
        cardSalesBhd: 5.5, // 5500
        cardOrders: 3,
        benefitpaySalesBhd: 2.25, // 2250
        benefitpayOrders: 1,
        discountBhd: 1.2, // 1200
        cashCountedBhd: 12.3, // 12300
        deliveryLines: [
          { platformId: "p1", salesBhd: 8, orders: 2 }, // 8000
          { platformId: "p2", salesBhd: 3.75, orders: 1 }, // 3750
        ],
      }),
    );

    expect(f.cashSalesFils).toBe(10000);
    expect(f.cardSalesFils).toBe(5500);
    expect(f.benefitpaySalesFils).toBe(2250);
    expect(f.discountFils).toBe(1200);
    expect(f.cashCountedFils).toBe(12300);
    expect(f.deliverySalesFils).toBe(11750);
    // gross = 10000 + 5500 + 2250 + 11750
    expect(f.grossSalesFils).toBe(29500);
    // orders = 4 + 3 + 1 + (2 + 1)
    expect(f.totalOrders).toBe(11);
    expect(f.deliveryLines).toEqual([
      { platformId: "p1", salesFils: 8000, orders: 2 },
      { platformId: "p2", salesFils: 3750, orders: 1 },
    ]);
  });

  it("is all zeros for an empty closing", () => {
    const f = computeClosingFigures(figures());
    expect(f.grossSalesFils).toBe(0);
    expect(f.totalOrders).toBe(0);
    expect(f.deliverySalesFils).toBe(0);
    expect(f.deliveryLines).toEqual([]);
  });
});
