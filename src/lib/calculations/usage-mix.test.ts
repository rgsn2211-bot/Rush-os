import { describe, it, expect } from "vitest";
import {
  usageMix,
  isHighWaste,
  emptyBuckets,
  WASTE_ALERT_PCT,
} from "./usage-mix";

describe("usageMix", () => {
  it("splits consumption into percentages that add up to 100", () => {
    const mix = usageMix({
      sold: 8000,
      used: 1000,
      wasted: 800,
      shrinkage: 200,
      overage: 0,
    });

    expect(mix.totalConsumedFils).toBe(10000);
    expect(mix.pct.sold).toBe(80);
    expect(mix.pct.used).toBe(10);
    expect(mix.pct.wasted).toBe(8);
    expect(mix.pct.shrinkage).toBe(2);
    expect(mix.pct.sold + mix.pct.used + mix.pct.wasted + mix.pct.shrinkage).toBe(
      100,
    );
  });

  it("counts waste and shrinkage together as the waste rate", () => {
    const mix = usageMix({
      sold: 9000,
      used: 0,
      wasted: 600,
      shrinkage: 400,
      overage: 0,
    });

    expect(mix.wasteRatePct).toBe(10);
  });

  it("excludes overage from consumption — stock found was never consumed", () => {
    const withOverage = usageMix({
      sold: 1000,
      used: 0,
      wasted: 0,
      shrinkage: 0,
      overage: 5000,
    });

    expect(withOverage.totalConsumedFils).toBe(1000);
    expect(withOverage.pct.sold).toBe(100);
  });

  it("returns zeros rather than NaN when nothing was consumed", () => {
    const mix = usageMix(emptyBuckets());

    expect(mix.totalConsumedFils).toBe(0);
    expect(mix.wasteRatePct).toBe(0);
    expect(mix.pct.wasted).toBe(0);
    expect(Number.isNaN(mix.wasteRatePct)).toBe(false);
  });
});

describe("isHighWaste", () => {
  const atRate = (wastePct: number) =>
    usageMix({
      sold: 100000 - wastePct * 1000,
      used: 0,
      wasted: wastePct * 1000,
      shrinkage: 0,
      overage: 0,
    });

  it("does not flag exactly the threshold — 5% is not above 5%", () => {
    const mix = atRate(5);
    expect(mix.wasteRatePct).toBe(WASTE_ALERT_PCT);
    expect(isHighWaste(mix)).toBe(false);
  });

  it("flags anything above the threshold", () => {
    expect(isHighWaste(atRate(5.01))).toBe(true);
    expect(isHighWaste(atRate(12))).toBe(true);
  });

  it("does not flag below the threshold", () => {
    expect(isHighWaste(atRate(4.9))).toBe(false);
    expect(isHighWaste(atRate(0))).toBe(false);
  });

  it("never flags a low-volume item, however bad its percentage", () => {
    // One wasted unit of something barely used is 100% waste but meaningless.
    const mix = usageMix({
      sold: 0,
      used: 0,
      wasted: 50,
      shrinkage: 0,
      overage: 0,
    });

    expect(mix.wasteRatePct).toBe(100);
    expect(mix.lowVolume).toBe(true);
    expect(isHighWaste(mix)).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(isHighWaste(atRate(8), 10)).toBe(false);
    expect(isHighWaste(atRate(12), 10)).toBe(true);
  });
});
