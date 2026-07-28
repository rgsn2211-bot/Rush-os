import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { getProfitReport } from "@/services/profit";
import { resolvePeriod } from "@/lib/dates";

const PERIOD = resolvePeriod("2026-07-01", "2026-07-31");

const closing = (id: string, date: string, over: Record<string, unknown> = {}) => ({
  id,
  report_date: date,
  status: "approved",
  total_orders: 10,
  discount_fils: 0,
  cash_sales_fils: 10000,
  cash_orders: 4,
  card_sales_fils: 20000,
  card_orders: 4,
  benefitpay_sales_fils: 0,
  benefitpay_orders: 0,
  delivery_sales_fils: 5000,
  gross_sales_fils: 35000,
  cash_counted_fils: 10000,
  cash_expected_fils: 10000,
  cash_variance_fils: 0,
  ...over,
});

function seedDb(): FakeDb {
  return makeFakeDb({
    daily_closings: [
      closing("c1", "2026-07-10"),
      closing("c2", "2026-07-31"),
      // Outside the period — must be excluded by [from, to).
      closing("c3", "2026-08-01"),
      // Pending closings never count as revenue.
      closing("c4", "2026-07-12", { status: "needs_review" }),
    ],
    daily_closing_delivery_lines: [
      { id: "dl1", closing_id: "c1", platform_id: "plat1", sales_fils: 5000, orders: 2 },
      { id: "dl2", closing_id: "c2", platform_id: "plat1", sales_fils: 5000, orders: 2 },
    ],
    delivery_platforms: [
      { id: "plat1", name: "Talabat", commission_bps: 2000, fixed_fee_fils: 0, active: true },
    ],
    inventory_usage: [
      {
        id: "u1",
        occurred_on: "2026-07-10",
        source_type: "pos_import",
        source_id: "imp1",
        inventory_item_id: "item1",
        product_id: "prod1",
        product_group_id: "g1",
        product_group_name: "Menu",
        qty_base: 2000,
        cogs_fils: 4000,
      },
      {
        id: "u2",
        occurred_on: "2026-07-10",
        source_type: "pos_import",
        source_id: "imp1",
        inventory_item_id: "item1",
        product_id: "prod2",
        product_group_id: "g2",
        product_group_name: "Staff",
        qty_base: 500,
        cogs_fils: 1000,
      },
      // Backfilled row from before per-product tracking.
      {
        id: "u3",
        occurred_on: "2026-07-05",
        source_type: "pos_import",
        source_id: "imp0",
        inventory_item_id: "item1",
        product_id: null,
        product_group_id: null,
        product_group_name: null,
        qty_base: 250,
        cogs_fils: 500,
      },
      // Waste + count losses.
      {
        id: "u4",
        occurred_on: "2026-07-11",
        source_type: "waste",
        source_id: "w1",
        inventory_item_id: "item1",
        product_id: null,
        qty_base: 100,
        cogs_fils: 200,
      },
      {
        id: "u5",
        occurred_on: "2026-07-12",
        source_type: "count",
        source_id: "cnt1",
        inventory_item_id: "item1",
        product_id: null,
        qty_base: 50,
        cogs_fils: 300,
      },
      // Outside the period.
      {
        id: "u6",
        occurred_on: "2026-08-01",
        source_type: "pos_import",
        source_id: "imp9",
        inventory_item_id: "item1",
        product_id: "prod1",
        qty_base: 999,
        cogs_fils: 9999,
      },
    ],
    pos_imports: [
      {
        id: "imp1",
        report_type: "sales_by_item",
        branch: "Rush",
        report_date: "2026-07-10",
        status: "processed",
        inventory_deducted: true,
      },
    ],
    pos_sales_rows: [
      {
        id: "sr1",
        import_id: "imp1",
        pos_item_id: 1,
        pos_item_name: "Latte",
        qty_sold: 20,
        amount_fils: 28000,
        product_id: "prod1",
        status: "mapped",
      },
      {
        id: "sr2",
        import_id: "imp1",
        pos_item_id: 2,
        pos_item_name: "Staff Drink",
        qty_sold: 5,
        amount_fils: 0,
        product_id: "prod2",
        status: "mapped",
      },
    ],
    products: [
      { id: "prod1", name: "Latte", price_fils: 1400, group_id: "g1", status: "approved" },
      { id: "prod2", name: "Staff Drink", price_fils: 0, group_id: "g2", status: "approved" },
    ],
    inventory_items: [
      {
        id: "item1",
        name: "Milk",
        base_unit: "ml",
        stock_unit: "L",
        base_per_stock: 1000,
        purchase_unit: "carton",
        units_per_purchase: 12,
        expiry: "optional",
        tracks_open: false,
        min_base_qty: 0,
        safety_days: 0,
        stock_base_qty: 1000,
        stock_value_fils: 2000,
        last_unit_cost_fils: 2,
        default_cost_fils: 2,
        costing_method: "weighted_average",
        status: "approved",
      },
    ],
    complimentary_logs: [
      {
        id: "comp1",
        description: "Latte",
        amount_fils: 1400,
        cost_fils: 400,
        reason: "customer_goodwill",
        product_id: "prod1",
        occurred_at: "2026-07-15T10:00:00Z",
        status: "approved",
      },
      {
        id: "comp2",
        description: "Latte",
        amount_fils: 1400,
        cost_fils: 400,
        reason: "customer_goodwill",
        product_id: "prod1",
        occurred_at: "2026-07-16T10:00:00Z",
        status: "needs_review", // pending — excluded
      },
    ],
    expenses: [
      { id: "e1", spent_on: "2026-07-08", method: "Cash", account: "register", total_fils: 3000 },
      { id: "e2", spent_on: "2026-08-02", method: "Cash", account: "register", total_fils: 7777 },
    ],
    expense_lines: [
      { id: "el1", expense_id: "e1", category: "Rent", amount_fils: 2000 },
      { id: "el2", expense_id: "e1", category: "Supplies", amount_fils: 1000 },
      { id: "el3", expense_id: "e2", category: "Rent", amount_fils: 7777 },
    ],
    settlements: [
      {
        id: "s1",
        channel: "delivery",
        platform: "Talabat",
        period_label: "2026-07-10",
        expected_fils: 4000,
        fee_fils: 1000,
        gross_fils: 5000,
        sales_date: "2026-07-10",
        status: "pending",
        auto_created: true,
      },
      {
        id: "s2",
        channel: "card",
        period_label: "2026-07-10",
        expected_fils: 20000,
        fee_fils: null,
        gross_fils: 20000,
        sales_date: "2026-07-10",
        status: "pending",
        auto_created: true,
      },
    ],
    settlement_payments: [
      {
        id: "sp1",
        channel: "card",
        kind: "commission",
        amount_fils: 600,
        period_from: "2026-07-01",
        period_to: "2026-07-15",
        fee_type: "Processing fee",
      },
      // Delivery recorded commission must NOT double-count with the accrual.
      {
        id: "sp2",
        channel: "delivery",
        platform: "Talabat",
        kind: "commission",
        amount_fils: 950,
        period_from: "2026-07-01",
        period_to: "2026-07-15",
        fee_type: "Commission",
      },
    ],
    cash_movements: [
      {
        id: "m1",
        direction: "in",
        reason: "Balance adjustment",
        amount_fils: 800,
        method: "Cash",
        occurred_on: "2026-07-20",
        affects_pl: true,
        account: "register",
        source_type: "balance_adjustment",
        source_id: "adj1",
      },
      // Expense-posted movement: affects_pl but already counted via expenses.
      {
        id: "m2",
        direction: "out",
        reason: "Expense — Cash",
        amount_fils: 3000,
        method: "Cash",
        occurred_on: "2026-07-08",
        affects_pl: true,
        account: "register",
        source_type: "expense",
        source_id: "e1",
      },
    ],
  });
}

const asClient = (db: FakeDb) => db as unknown as SupabaseClient;

describe("getProfitReport", () => {
  it("aggregates revenue from approved closings inside [from, to) only", async () => {
    const report = await getProfitReport(asClient(seedDb()), PERIOD);

    expect(report.revenue.closingsCount).toBe(2); // c1 + c2; c3 out of range, c4 pending
    expect(report.revenue.grossSalesFils).toBe(70000);
    expect(report.revenue.methods.find((m) => m.key === "card")!.salesFils).toBe(40000);
    expect(report.revenue.deliveryPlatforms).toEqual([
      { platformId: "plat1", name: "Talabat", salesFils: 10000, orders: 4 },
    ]);
    expect(report.revenue.daysInPeriod).toBe(31);
  });

  it("breaks COGS down by product and group, summing exactly to the total", async () => {
    const report = await getProfitReport(asClient(seedDb()), PERIOD);

    expect(report.cogs.totalFils).toBe(4000 + 1000 + 500); // u1 + u2 + backfill u3
    expect(report.cogs.unattributedFils).toBe(500);

    const groupSum = report.cogs.byGroup.reduce((s, g) => s + g.cogsFils, 0);
    expect(groupSum).toBe(report.cogs.totalFils);
    expect(report.cogs.byGroup.find((g) => g.name === "Staff")!.cogsFils).toBe(1000);

    const latte = report.cogs.byProduct.find((p) => p.productId === "prod1")!;
    expect(latte.cogsFils).toBe(4000);
    expect(latte.unitsSold).toBe(20);
    expect(latte.salesFils).toBe(28000);
    expect(latte.groupName).toBe("Menu");
  });

  it("computes the P&L rollup without double-counting comp cost, expenses, or delivery fees", async () => {
    const report = await getProfitReport(asClient(seedDb()), PERIOD);

    // Comp cost is an "of which" inside COGS.
    expect(report.cogs.complimentaryCostFils).toBe(400); // approved log only
    expect(report.cogs.complimentaryValueFils).toBe(1400);

    // Fees: delivery accrual (1000) + card recorded (600); the recorded
    // delivery entry (950) is excluded — the accrual already covers it.
    expect(report.fees.deliveryCommissionFils).toBe(1000);
    expect(report.fees.recordedFeesFils).toBe(600);

    // Expenses in period only; expense cash movement not counted again.
    expect(report.expensesTotalFils).toBe(3000);
    expect(report.otherPl.netFils).toBe(800);

    // Losses from waste + count shrinkage.
    expect(report.losses.totalFils).toBe(200 + 300);

    const s = report.summary;
    expect(s.grossProfitFils).toBe(70000 - 5500);
    expect(s.netProfitFils).toBe(
      70000 - 5500 - 3000 - 1600 - 500 + 800,
    );

    // Comp cost must not change the rollup: zero it and re-run.
    const db2 = seedDb();
    db2.tables.complimentary_logs[0].cost_fils = 0;
    const report2 = await getProfitReport(asClient(db2), PERIOD);
    expect(report2.summary.netProfitFils).toBe(s.netProfitFils);
  });
});
