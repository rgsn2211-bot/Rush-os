import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { recordPurchase, updatePurchase, getPurchaseWithItems } from "./purchases";
import { getPayables } from "./money";

const OWNER = "owner-1";
const db = (f: FakeDb) => f as unknown as SupabaseClient;

/** Milk: 1 case = 12 L = 12 000 ml base. */
function baseItem(over: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    name: "Milk",
    category: null,
    base_unit: "ml",
    stock_unit: "L",
    base_per_stock: 1000,
    purchase_unit: "case",
    units_per_purchase: 12,
    expiry: "not_needed",
    tracks_open: false,
    shelf_life_days: null,
    open_life_days: null,
    min_base_qty: 0,
    max_base_qty: null,
    safety_days: 0,
    supplier_id: null,
    stock_base_qty: 0,
    stock_value_fils: 0,
    default_cost_fils: 0,
    costing_method: "weighted_average",
    status: "approved",
    created_by: OWNER,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...over,
  };
}

async function approvedCashPurchase(f: FakeDb) {
  return recordPurchase(
    db(f),
    {
      isPaid: true,
      paidMethod: "cash",
      items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }],
    },
    OWNER,
    "approved",
  );
}

describe("updatePurchase — approved", () => {
  it("re-applies corrected quantity/cost to stock, value and payment", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase } = await approvedCashPurchase(f);

    // Baseline: 2 cases → 24 000 ml, value 1000, one register cash-out.
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(24000);
    expect(f.tables.inventory_items[0].stock_value_fils).toBe(1000);
    expect(f.tables.cash_movements).toHaveLength(1);

    await updatePurchase(
      db(f),
      purchase.id,
      {
        isPaid: true,
        paidMethod: "cash",
        items: [{ inventoryItemId: "item-1", purchaseQty: 3, unitCostFils: 600 }],
      },
      OWNER,
    );

    const item = f.tables.inventory_items[0];
    expect(item.stock_base_qty).toBe(36000); // 3 * 12 000
    expect(item.stock_value_fils).toBe(1800); // 3 * 600
    expect(f.tables.purchases[0].total_fils).toBe(1800);

    // Old cash-out reversed, one reposted at the new total.
    const mv = f.tables.cash_movements.filter(
      (m) => m.source_type === "purchase_payment",
    );
    expect(mv).toHaveLength(1);
    expect(mv[0].amount_fils).toBe(1800);
    expect(mv[0].account).toBe("register");

    // Line items replaced, not duplicated.
    const { items } = (await getPurchaseWithItems(db(f), purchase.id))!;
    expect(items).toHaveLength(1);
    expect(items[0].purchaseQty).toBe(3);
  });

  it("switching an approved purchase to unpaid removes the payment and makes it a payable", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase } = await approvedCashPurchase(f);

    await updatePurchase(
      db(f),
      purchase.id,
      {
        isPaid: false,
        dueDate: "2026-08-01",
        items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }],
      },
      OWNER,
    );

    expect(
      f.tables.cash_movements.filter((m) => m.source_type === "purchase_payment"),
    ).toHaveLength(0);
    expect(f.tables.purchases[0].is_paid).toBe(false);
    const payables = await getPayables(db(f));
    expect(payables.map((p) => p.id)).toContain(purchase.id);
  });

  it("edits header fields without disturbing stock", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase } = await approvedCashPurchase(f);

    await updatePurchase(
      db(f),
      purchase.id,
      {
        purchasedOn: "2026-07-10",
        isPaid: true,
        paidMethod: "cash",
        items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }],
      },
      OWNER,
    );

    expect(f.tables.inventory_items[0].stock_base_qty).toBe(24000);
    expect(f.tables.inventory_items[0].stock_value_fils).toBe(1000);
    expect(f.tables.purchases[0].purchased_on).toBe("2026-07-10");
  });

  it("refuses to edit a voided purchase", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase } = await approvedCashPurchase(f);
    f.tables.purchases[0].status = "voided";

    await expect(
      updatePurchase(
        db(f),
        purchase.id,
        {
          isPaid: false,
          items: [{ inventoryItemId: "item-1", purchaseQty: 1, unitCostFils: 100 }],
        },
        OWNER,
      ),
    ).rejects.toThrow(/voided/);
  });
});
