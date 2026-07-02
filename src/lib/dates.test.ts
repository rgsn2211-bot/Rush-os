import { describe, it, expect, vi, afterEach } from "vitest";
import { todayInBahrain } from "./dates";

describe("todayInBahrain", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a YYYY-MM-DD string", () => {
    expect(todayInBahrain()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses the Bahrain (UTC+3) calendar date, not UTC", () => {
    // 2026-07-02 01:30 UTC is still 2026-07-01 in UTC, but Bahrain (UTC+3)
    // has already rolled over to 2026-07-02 04:30. This is the after-midnight
    // window that broke the closing upload.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T01:30:00Z"));
    expect(todayInBahrain()).toBe("2026-07-02");
  });

  it("does not roll forward too early in the Bahrain evening", () => {
    // 2026-07-02 20:00 UTC is 2026-07-02 23:00 in Bahrain — still the 2nd.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T20:00:00Z"));
    expect(todayInBahrain()).toBe("2026-07-02");
  });
});
