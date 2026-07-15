import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import {
  recordPayout,
  recordCommission,
  removeSettlementPayment,
  getSettlementLedgers,
} from "./money";

const OWNER = "owner-1";
const db = (f: FakeDb) => f as unknown as SupabaseClient;

function pendingSettlement(over: Record<string, unknown> = {}) {
  return {
    id: `s-${Math.random().toString(36).slice(2)}`,
    channel: "card",
    platform: null,
    period_label: "2026-07-01",
    expected_fils: 10000,
    fee_fils: null,
    actual_fils: null,
    received_on: null,
    status: "pending",
    note: null,
    sales_date: "2026-07-01",
    gross_fils: 10000,
    source_closing_id: null,
    auto_created: true,
    created_by: OWNER,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...over,
  };
}

describe("settlement ledger — running total", () => {
  it("pools pending settlements into should-have per channel", async () => {
    const f = makeFakeDb({
      settlements: [
        pendingSettlement({ expected_fils: 10000 }),
        pendingSettlement({ expected_fils: 5000 }),
      ],
    });

    const ledgers = await getSettlementLedgers(db(f));
    const card = ledgers.find((l) => l.channel === "card")!;
    expect(card.shouldHaveFils).toBe(15000);
    expect(card.receivedFils).toBe(0);
    expect(card.commissionFils).toBe(0);
    expect(card.stillOwedFils).toBe(15000);
  });

  it("payout adds cash to the bank and lowers still-owed", async () => {
    const f = makeFakeDb({
      settlements: [pendingSettlement({ expected_fils: 15000 })],
    });

    await recordPayout(
      db(f),
      { channel: "card", amountBhd: 12, receivedOn: "2026-07-20" },
      OWNER,
    );

    // Bank cash-in posted for the payout.
    const mv = f.tables.cash_movements;
    expect(mv).toHaveLength(1);
    expect(mv[0].account).toBe("bank");
    expect(mv[0].direction).toBe("in");
    expect(mv[0].amount_fils).toBe(12000);
    expect(mv[0].source_type).toBe("settlement_payout");

    const card = (await getSettlementLedgers(db(f))).find(
      (l) => l.channel === "card",
    )!;
    expect(card.receivedFils).toBe(12000);
    expect(card.stillOwedFils).toBe(3000);
  });

  it("commission lowers still-owed without moving cash", async () => {
    const f = makeFakeDb({
      settlements: [pendingSettlement({ expected_fils: 15000 })],
    });

    await recordPayout(
      db(f),
      { channel: "card", amountBhd: 12, receivedOn: "2026-07-20" },
      OWNER,
    );
    await recordCommission(
      db(f),
      {
        channel: "card",
        amountBhd: 3,
        periodFrom: "2026-07-01",
        periodTo: "2026-07-10",
        feeType: "Processing fee",
      },
      OWNER,
    );

    // Still only the payout's cash movement — commission does not touch cash.
    expect(f.tables.cash_movements).toHaveLength(1);

    const card = (await getSettlementLedgers(db(f))).find(
      (l) => l.channel === "card",
    )!;
    expect(card.receivedFils).toBe(12000);
    expect(card.commissionFils).toBe(3000);
    expect(card.stillOwedFils).toBe(0);
  });

  it("deleting a payout reverses the bank credit", async () => {
    const f = makeFakeDb({
      settlements: [pendingSettlement({ expected_fils: 15000 })],
    });
    const payment = await recordPayout(
      db(f),
      { channel: "card", amountBhd: 12, receivedOn: "2026-07-20" },
      OWNER,
    );
    expect(f.tables.cash_movements).toHaveLength(1);

    await removeSettlementPayment(db(f), payment.id);

    expect(f.tables.settlement_payments).toHaveLength(0);
    expect(f.tables.cash_movements).toHaveLength(0);
    const card = (await getSettlementLedgers(db(f))).find(
      (l) => l.channel === "card",
    )!;
    expect(card.receivedFils).toBe(0);
    expect(card.stillOwedFils).toBe(15000);
  });

  it("tracks delivery ledgers per platform", async () => {
    const f = makeFakeDb({
      settlements: [
        pendingSettlement({
          channel: "delivery",
          platform: "Talabat",
          expected_fils: 8000,
        }),
        pendingSettlement({
          channel: "delivery",
          platform: "Jahez",
          expected_fils: 6000,
        }),
      ],
    });

    await recordPayout(
      db(f),
      {
        channel: "delivery",
        platform: "Talabat",
        amountBhd: 7,
        receivedOn: "2026-07-25",
      },
      OWNER,
    );

    const ledgers = await getSettlementLedgers(db(f));
    const talabat = ledgers.find((l) => l.platform === "Talabat")!;
    const jahez = ledgers.find((l) => l.platform === "Jahez")!;
    expect(talabat.shouldHaveFils).toBe(8000);
    expect(talabat.receivedFils).toBe(7000);
    expect(talabat.stillOwedFils).toBe(1000);
    // Jahez untouched.
    expect(jahez.receivedFils).toBe(0);
    expect(jahez.stillOwedFils).toBe(6000);
  });
});
