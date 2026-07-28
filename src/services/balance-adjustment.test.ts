import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import {
  recordBalanceAdjustment,
  removeBalanceAdjustment,
} from "./money";
import { getBankBalance, getRegisterBalance } from "@/repositories/cash-movements";

const OWNER = "owner-1";
const db = (f: FakeDb) => f as unknown as SupabaseClient;

function movement(over: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    direction: "in",
    reason: "seed",
    amount_fils: 100000,
    method: "Bank transfer",
    occurred_on: "2026-07-01",
    affects_pl: false,
    account: "bank",
    source_type: null,
    source_id: null,
    ...over,
  };
}

describe("balance adjustments", () => {
  it("recomputes the balance at confirm and posts the difference to the account", async () => {
    // Books say 100.000 BHD in the bank; the owner counted 87.500.
    const f = makeFakeDb({ cash_movements: [movement()] });

    const adj = await recordBalanceAdjustment(
      db(f),
      {
        account: "bank",
        actualBhd: 87.5,
        occurredOn: "2026-07-31",
        affectsPl: true,
      },
      OWNER,
    );

    expect(adj.expectedFils).toBe(100000);
    expect(adj.actualFils).toBe(87500);
    expect(adj.diffFils).toBe(-12500);

    // The posted movement brings the account to exactly the counted amount.
    expect(await getBankBalance(db(f))).toBe(87500);
    const posted = f.tables.cash_movements.find(
      (m) => m.source_type === "balance_adjustment",
    )!;
    expect(posted.direction).toBe("out");
    expect(posted.amount_fils).toBe(12500);
    expect(posted.affects_pl).toBe(true);
    expect(posted.account).toBe("bank");
  });

  it("logs a zero-diff check without posting any movement", async () => {
    const f = makeFakeDb({ cash_movements: [movement()] });

    const adj = await recordBalanceAdjustment(
      db(f),
      { account: "bank", actualBhd: 100, occurredOn: "2026-07-31", affectsPl: true },
      OWNER,
    );

    expect(adj.diffFils).toBe(0);
    expect(f.tables.balance_adjustments).toHaveLength(1);
    expect(f.tables.cash_movements).toHaveLength(1); // only the seed
  });

  it("keeps accounts isolated: a register check ignores bank money", async () => {
    const f = makeFakeDb({
      cash_movements: [
        movement(),
        movement({ account: "register", amount_fils: 30000, method: "Cash" }),
      ],
    });

    const adj = await recordBalanceAdjustment(
      db(f),
      { account: "register", actualBhd: 35, occurredOn: "2026-07-31", affectsPl: true },
      OWNER,
    );

    expect(adj.expectedFils).toBe(30000);
    expect(adj.diffFils).toBe(5000);
    expect(await getRegisterBalance(db(f))).toBe(35000);
    expect(await getBankBalance(db(f))).toBe(100000); // untouched
  });

  it("deleting an adjustment reverses its posted movement", async () => {
    const f = makeFakeDb({ cash_movements: [movement()] });

    const adj = await recordBalanceAdjustment(
      db(f),
      { account: "bank", actualBhd: 87.5, occurredOn: "2026-07-31", affectsPl: true },
      OWNER,
    );
    expect(await getBankBalance(db(f))).toBe(87500);

    await removeBalanceAdjustment(db(f), adj.id);

    expect(await getBankBalance(db(f))).toBe(100000);
    expect(f.tables.balance_adjustments).toHaveLength(0);
  });
});
