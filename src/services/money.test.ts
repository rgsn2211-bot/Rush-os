import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { markRecurringPaid } from "./money";

const OWNER = "owner-1";
const db = (f: FakeDb) => f as unknown as SupabaseClient;
const today = () => new Date().toISOString().split("T")[0];

function rent(over: Record<string, unknown> = {}) {
  return {
    id: "rc-1",
    name: "Rent",
    cost_type: "Rent",
    amount_fils: 100000,
    frequency: "Monthly",
    next_due_date: "2026-07-01",
    default_method: "Bank transfer",
    active: true,
    created_by: OWNER,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...over,
  };
}

describe("markRecurringPaid — advance N periods", () => {
  it("books one expense per period at its due date, one cash-out today per period", async () => {
    const f = makeFakeDb({ recurring_costs: [rent()] });

    await markRecurringPaid(db(f), "rc-1", 3, OWNER);

    const expenses = f.tables.expenses;
    expect(expenses).toHaveLength(3);
    expect(expenses.map((e) => e.spent_on).sort()).toEqual([
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);

    const mv = f.tables.cash_movements;
    expect(mv).toHaveLength(3);
    expect(mv.every((m) => m.occurred_on === today())).toBe(true);
    expect(mv.every((m) => m.amount_fils === 100000)).toBe(true);
    expect(mv.every((m) => m.account === "bank")).toBe(true);

    // next due advances by the 3 covered periods
    expect(f.tables.recurring_costs[0].next_due_date).toBe("2026-10-01");
  });

  it("defaults to a single period", async () => {
    const f = makeFakeDb({ recurring_costs: [rent()] });
    await markRecurringPaid(db(f), "rc-1", 1, OWNER);
    expect(f.tables.expenses).toHaveLength(1);
    expect(f.tables.recurring_costs[0].next_due_date).toBe("2026-08-01");
  });

  it("forces a single payment for One-time and deactivates it", async () => {
    const f = makeFakeDb({
      recurring_costs: [rent({ frequency: "One-time" })],
    });
    await markRecurringPaid(db(f), "rc-1", 5, OWNER);
    expect(f.tables.expenses).toHaveLength(1);
    expect(f.tables.recurring_costs[0].active).toBe(false);
  });
});
