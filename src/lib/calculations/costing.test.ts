import { describe, it, expect } from "vitest";
import {
  purchaseToBaseQty,
  receiveStock,
  averageUnitCostFils,
  consumeStock,
  recipeCostFils,
  grossMargin,
  type StockState,
} from "./costing";

describe("unit conversion", () => {
  it("converts purchase units to base units (same stock & base unit)", () => {
    expect(purchaseToBaseQty(2, 12)).toBe(24); // 2 cases x 12 L, basePerStock defaults to 1
    expect(purchaseToBaseQty(1, 1000)).toBe(1000); // 1 case x 1000 units
  });

  it("applies basePerStock when stock and base units differ", () => {
    // 2 bags, 25 kg/bag, 1000 g/kg -> 50 000 g
    expect(purchaseToBaseQty(2, 25, 1000)).toBe(50000);
    // 1 case of 6 bottles, 750 ml/bottle -> 4500 ml
    expect(purchaseToBaseQty(1, 6, 750)).toBe(4500);
  });

  it("rejects a non-positive conversion factor", () => {
    expect(() => purchaseToBaseQty(1, 0)).toThrow();
    expect(() => purchaseToBaseQty(1, 5, 0)).toThrow();
  });
});

describe("weighted-average cost", () => {
  const empty: StockState = { baseQty: 0, valueFils: 0 };

  it("first receipt sets the average to its own cost", () => {
    const s = receiveStock(empty, 10, 5000); // 10 L worth 5.000 BHD
    expect(averageUnitCostFils(s)).toBe(500); // 0.500 BHD per L
  });

  it("blends two receipts at different prices", () => {
    // 10 L at 500 fils/L  +  10 L at 700 fils/L  -> avg 600 fils/L
    let s = receiveStock(empty, 10, 5000);
    s = receiveStock(s, 10, 7000);
    expect(s.baseQty).toBe(20);
    expect(s.valueFils).toBe(12000);
    expect(averageUnitCostFils(s)).toBe(600);
  });

  it("average cost of empty stock is 0", () => {
    expect(averageUnitCostFils(empty)).toBe(0);
  });

  it("consuming returns COGS at the current average", () => {
    let s = receiveStock(empty, 20, 12000); // avg 600 fils/L
    const { state, cogsFils } = consumeStock(s, 5);
    expect(cogsFils).toBe(3000); // 5 x 600
    expect(state.baseQty).toBe(15);
    expect(state.valueFils).toBe(9000);
    s = state;
    expect(averageUnitCostFils(s)).toBe(600); // average unchanged by consumption
  });

  it("emptying stock leaves no leftover fils", () => {
    // A price that does not divide evenly per unit.
    const s = receiveStock(empty, 3, 1000); // avg 333.33 fils/L
    const first = consumeStock(s, 1); // rounds to 333
    expect(first.cogsFils).toBe(333);
    const second = consumeStock(first.state, 2); // takes the rest exactly
    expect(second.state.baseQty).toBe(0);
    expect(second.state.valueFils).toBe(0);
    expect(first.cogsFils + second.cogsFils).toBe(1000); // total COGS == total cost
  });

  it("rejects consuming more than on hand", () => {
    const s = receiveStock(empty, 5, 5000);
    expect(() => consumeStock(s, 6)).toThrow();
  });
});

describe("recipe cost and margin", () => {
  it("sums ingredient costs (qty x unit cost), rounded per line", () => {
    // Flat White-ish: 18 g espresso @ 16 fils/g + 0.15 L milk @ 380 fils/L
    const cost = recipeCostFils([
      { qtyBase: 18, unitCostFils: 16 }, // 288
      { qtyBase: 0.15, unitCostFils: 380 }, // 57
      { qtyBase: 1, unitCostFils: 30 }, // cup 30
      { qtyBase: 1, unitCostFils: 20 }, // lid 20
    ]);
    expect(cost).toBe(395);
  });

  it("computes gross margin in fils and percent", () => {
    const { marginFils, marginPct } = grossMargin(1400, 395);
    expect(marginFils).toBe(1005);
    expect(Math.round(marginPct)).toBe(72);
  });

  it("margin percent is 0 when price is 0", () => {
    expect(grossMargin(0, 100).marginPct).toBe(0);
  });
});
