import { describe, it, expect } from "vitest";
import {
  bhdToFils,
  filsToBhd,
  parseBhdToFils,
  formatFils,
  formatBhd,
  bhdRateToFils,
  formatFilsRate,
} from "./currency";

describe("currency (BHD, 3 decimals)", () => {
  it("converts BHD to integer fils without float drift", () => {
    expect(bhdToFils(2.3)).toBe(2300);
    expect(bhdToFils(2.0)).toBe(2000);
    expect(bhdToFils(1.2)).toBe(1200);
    // 0.1 + 0.2 style drift must not leak into money
    expect(bhdToFils(0.1 + 0.2)).toBe(300);
  });

  it("round-trips fils <-> BHD", () => {
    expect(filsToBhd(2300)).toBe(2.3);
    expect(filsToBhd(bhdToFils(1.9))).toBe(1.9);
  });

  it("parses POS text amounts to fils", () => {
    expect(parseBhdToFils("2.000")).toBe(2000);
    expect(parseBhdToFils("2.300")).toBe(2300);
    expect(parseBhdToFils("1.200")).toBe(1200);
    expect(parseBhdToFils(" 2.300 ")).toBe(2300);
    expect(parseBhdToFils(2.3)).toBe(2300);
  });

  it("returns null for unparseable amounts instead of guessing zero", () => {
    expect(parseBhdToFils("")).toBeNull();
    expect(parseBhdToFils("abc")).toBeNull();
    expect(parseBhdToFils(null)).toBeNull();
    expect(parseBhdToFils(undefined)).toBeNull();
  });

  it("formats with exactly 3 decimals", () => {
    expect(formatFils(2300)).toBe("2.300");
    expect(formatBhd(2)).toBe("2.000");
    expect(formatBhd(1.5)).toBe("1.500");
  });
});

describe("unit-rate conversion (sub-fil precision)", () => {
  it("keeps fractional fils for a per-unit cost rate", () => {
    // 0.00054 BHD/ml = 0.54 fils/ml — must NOT round to a whole fil.
    expect(bhdRateToFils(0.00054)).toBe(0.54);
    expect(bhdRateToFils(0.001)).toBe(1);
    expect(bhdRateToFils(0)).toBe(0);
  });

  it("absorbs float noise by rounding to millifils", () => {
    // 0.00012345 BHD/ml = 0.12345 fils/ml; rounded to millifils = 0.123.
    expect(bhdRateToFils(0.00012345)).toBe(0.123);
  });

  it("round-trips a rate back to BHD for display", () => {
    expect(formatFilsRate(bhdRateToFils(0.00054))).toBe("0.00054");
    // Still pads to at least 3 decimals like a normal amount.
    expect(formatFilsRate(540)).toBe("0.540");
  });
});
