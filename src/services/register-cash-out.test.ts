import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { logCashOut, reviewCashOut, deleteOwnCashOut } from "./register-cash-out";

const WORKER = "worker-1";
const OWNER = "owner-1";
const db = (f: FakeDb) => f as unknown as SupabaseClient;

describe("register cash-out — immediate deduction", () => {
  it("posts the register movement the moment the worker records it", async () => {
    const f = makeFakeDb({});
    await logCashOut(
      db(f),
      { kind: "purchase", amountBhd: 5, reason: "Milk run" },
      WORKER,
    );

    expect(f.tables.register_cash_outs[0].status).toBe("needs_review");
    const mv = f.tables.cash_movements;
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({
      direction: "out",
      account: "register",
      amount_fils: 5000,
      source_type: "register_cash_out",
      created_by: WORKER,
    });
  });

  it("approve keeps the movement (already posted)", async () => {
    const f = makeFakeDb({});
    const co = await logCashOut(
      db(f),
      { kind: "withdrawal", amountBhd: 3, reason: "float" },
      WORKER,
    );
    await reviewCashOut(db(f), co.id, "approve", OWNER);
    expect(f.tables.register_cash_outs[0].status).toBe("approved");
    expect(f.tables.cash_movements).toHaveLength(1);
  });

  it("reject reverses the movement", async () => {
    const f = makeFakeDb({});
    const co = await logCashOut(
      db(f),
      { kind: "withdrawal", amountBhd: 3, reason: "float" },
      WORKER,
    );
    await reviewCashOut(db(f), co.id, "reject", OWNER);
    expect(f.tables.register_cash_outs[0].status).toBe("voided");
    expect(f.tables.cash_movements ?? []).toHaveLength(0);
  });

  it("deleting own pending cash-out reverses the movement", async () => {
    const f = makeFakeDb({});
    const co = await logCashOut(
      db(f),
      { kind: "purchase", amountBhd: 2, reason: "napkins" },
      WORKER,
    );
    await deleteOwnCashOut(db(f), co.id, WORKER);
    expect(f.tables.register_cash_outs ?? []).toHaveLength(0);
    expect(f.tables.cash_movements ?? []).toHaveLength(0);
  });
});
