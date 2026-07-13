import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import {
  orderPurchase,
  receivePurchaseByOwner,
  approvePurchase,
  recordWorkerPurchase,
} from "./purchases";
import { getPayables, payPurchase } from "./money";

const OWNER = "owner-1";
const WORKER = "worker-1";
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
const withWorkerView = (over: Record<string, unknown> = {}) => ({
  inventory_items: [baseItem(over)],
  inventory_items_worker: [baseItem(over)],
});

describe("orderPurchase", () => {
  it("logs an order with no stock, no cash, unpaid", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase } = await orderPurchase(
      db(f),
      { items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }] },
      OWNER,
    );

    expect(purchase.status).toBe("ordered");
    expect(purchase.isPaid).toBe(false);
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(0);
    expect(f.tables.cash_movements ?? []).toHaveLength(0);
  });

  it("shows up as a payable immediately (order on credit)", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase } = await orderPurchase(
      db(f),
      { items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }] },
      OWNER,
    );
    const payables = await getPayables(db(f));
    expect(payables.map((p) => p.id)).toContain(purchase.id);
  });
});

describe("payPurchase (decoupled)", () => {
  it("pays an order before it is received and posts the cash-out once", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase } = await orderPurchase(
      db(f),
      { items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }] },
      OWNER,
    );

    await payPurchase(db(f), purchase.id, { paidMethod: "bank" }, OWNER);

    const mv = f.tables.cash_movements;
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({
      direction: "out",
      account: "bank",
      amount_fils: 1000,
      source_type: "purchase_payment",
    });

    const payables = await getPayables(db(f));
    expect(payables.map((p) => p.id)).not.toContain(purchase.id);

    await expect(
      payPurchase(db(f), purchase.id, { paidMethod: "bank" }, OWNER),
    ).rejects.toThrow(/already paid/);
  });
});

describe("receivePurchaseByOwner", () => {
  it("lands actual stock, auto-approves, and stays a payable when unpaid", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase, items } = await orderPurchase(
      db(f),
      { items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }] },
      OWNER,
    );

    await receivePurchaseByOwner(
      db(f),
      purchase.id,
      { items: [{ purchaseItemId: items[0].id, purchaseQty: 3, unitCostFils: 600 }] },
      OWNER,
    );

    const item = f.tables.inventory_items[0];
    expect(item.stock_base_qty).toBe(36000); // 3 * 12 * 1000
    expect(item.stock_value_fils).toBe(1800); // 3 * 600

    const p = f.tables.purchases[0];
    expect(p.status).toBe("approved");
    expect(p.total_fils).toBe(1800);
    expect(p.received_on).toBeTruthy();

    expect(f.tables.cash_movements ?? []).toHaveLength(0);
    const payables = await getPayables(db(f));
    expect(payables.map((x) => x.id)).toContain(purchase.id);
  });

  it("locks value to the prepaid amount and posts no second payment", async () => {
    const f = makeFakeDb({ inventory_items: [baseItem()] });
    const { purchase, items } = await orderPurchase(
      db(f),
      { items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }] },
      OWNER,
    );
    await payPurchase(db(f), purchase.id, { paidMethod: "cash" }, OWNER);

    await receivePurchaseByOwner(
      db(f),
      purchase.id,
      { items: [{ purchaseItemId: items[0].id, purchaseQty: 3 }] },
      OWNER,
    );

    const item = f.tables.inventory_items[0];
    expect(item.stock_base_qty).toBe(36000); // actual quantity
    expect(item.stock_value_fils).toBe(1000); // value locked to prepaid total
    expect(f.tables.purchases[0].total_fils).toBe(1000);
    expect(f.tables.cash_movements).toHaveLength(1); // only the prepay
  });
});

describe("recordWorkerPurchase (cash)", () => {
  it("deducts the register immediately at submit and waits for review", async () => {
    const f = makeFakeDb(withWorkerView());
    const { purchase } = await recordWorkerPurchase(
      db(f),
      {
        mode: "cash_purchase",
        isPaid: true,
        items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }],
      },
      WORKER,
    );

    expect(purchase.status).toBe("needs_review");
    expect(purchase.isPaid).toBe(true);

    const mv = f.tables.cash_movements;
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({
      direction: "out",
      account: "register",
      amount_fils: 1000,
      source_type: "purchase_payment",
      created_by: WORKER,
    });
    // stock does not move until approval
    expect(f.tables.inventory_items[0].stock_base_qty).toBe(0);
  });
});

describe("approvePurchase", () => {
  it("reconciles the register movement when the owner corrects a cash cost", async () => {
    const f = makeFakeDb(withWorkerView());
    const { purchase } = await recordWorkerPurchase(
      db(f),
      {
        mode: "cash_purchase",
        isPaid: true,
        items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 500 }],
      },
      WORKER,
    );
    const piId = f.tables.purchase_items[0].id;

    await approvePurchase(
      db(f),
      purchase.id,
      { items: [{ purchaseItemId: piId, unitCostFils: 550 }] },
      OWNER,
    );

    const item = f.tables.inventory_items[0];
    expect(item.stock_base_qty).toBe(24000); // 2 * 12000
    expect(item.stock_value_fils).toBe(1100); // 2 * 550

    expect(f.tables.purchases[0].status).toBe("approved");
    expect(f.tables.purchases[0].total_fils).toBe(1100);

    const mv = f.tables.cash_movements;
    expect(mv).toHaveLength(1); // old deleted, one reposted
    expect(mv[0].amount_fils).toBe(1100);
    expect(mv[0].account).toBe("register");
  });

  it("posts no payment for an unpaid supplier delivery — it becomes a payable", async () => {
    const f = makeFakeDb(withWorkerView());
    const { purchase } = await recordWorkerPurchase(
      db(f),
      {
        mode: "supplier_delivery",
        isPaid: false,
        items: [{ inventoryItemId: "item-1", purchaseQty: 2, unitCostFils: 0 }],
      },
      WORKER,
    );
    expect(f.tables.cash_movements ?? []).toHaveLength(0);
    const piId = f.tables.purchase_items[0].id;

    await approvePurchase(
      db(f),
      purchase.id,
      { items: [{ purchaseItemId: piId, unitCostFils: 400 }] },
      OWNER,
    );

    expect(f.tables.inventory_items[0].stock_value_fils).toBe(800); // 2 * 400
    expect(f.tables.cash_movements ?? []).toHaveLength(0);
    const payables = await getPayables(db(f));
    expect(payables.map((x) => x.id)).toContain(purchase.id);
  });
});
