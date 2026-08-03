import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProfitReport,
  RevenueMethodLine,
  RevenuePlatformLine,
  CogsProductLine,
  CogsGroupLine,
  CogsItemLine,
} from "@/types/reports";
import type { Period } from "@/lib/dates";
import { listApprovedClosingsBetween, listDeliveryLinesForClosings } from "@/repositories/daily-closing";
import { listDeliveryPlatforms } from "@/repositories/delivery-platforms";
import { listUsageBetween } from "@/repositories/inventory-usage";
import { listDeductedImportsBetween, listSalesRowsForImports } from "@/repositories/pos-imports";
import { listProducts } from "@/repositories/products";
import { listInventoryItems } from "@/repositories/inventory-items";
import { listApprovedComplimentaryBetween } from "@/repositories/complimentary";
import { listExpensesBetween } from "@/repositories/expenses";
import { listAutoSettlementsBetween } from "@/repositories/settlements";
import { listCommissionEntriesBetween } from "@/repositories/settlement-payments";
import { listPlMovementsBetween } from "@/repositories/cash-movements";

function daysBetween(fromInclusive: string, toExclusive: string): number {
  const from = new Date(`${fromInclusive}T00:00:00Z`).getTime();
  const to = new Date(`${toExclusive}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/**
 * The full P&L for one period. Revenue comes from approved Daily Closings (the
 * official revenue record); COGS from the inventory usage ledger (POS
 * deductions); losses from waste + count shrinkage; fees from the configured
 * delivery commission accrued per day plus recorded card/BenefitPay fee
 * entries; plus any cash movements the owner marked as affecting P&L.
 *
 * Complimentary cost is an attribution INSIDE POS COGS (those items were
 * already deducted by the POS import) — it is displayed but never subtracted
 * from profit a second time.
 */
export async function getProfitReport(
  db: SupabaseClient,
  period: Period,
): Promise<ProfitReport> {
  const { fromInclusive, toExclusive, toInclusive } = period;

  const [
    closings,
    platforms,
    usage,
    imports,
    products,
    items,
    compLogs,
    expenses,
    autoSettlements,
    commissionEntries,
    plMovements,
  ] = await Promise.all([
    listApprovedClosingsBetween(db, fromInclusive, toExclusive),
    listDeliveryPlatforms(db),
    listUsageBetween(db, fromInclusive, toExclusive),
    listDeductedImportsBetween(db, fromInclusive, toExclusive),
    listProducts(db),
    listInventoryItems(db),
    listApprovedComplimentaryBetween(db, fromInclusive, toExclusive),
    listExpensesBetween(db, fromInclusive, toExclusive),
    listAutoSettlementsBetween(db, fromInclusive, toExclusive),
    listCommissionEntriesBetween(db, fromInclusive, toExclusive),
    listPlMovementsBetween(db, fromInclusive, toExclusive),
  ]);

  // ---- Revenue (approved Daily Closings) ----------------------------------
  const sum = (ns: number[]) => ns.reduce((s, n) => s + n, 0);

  const methods: RevenueMethodLine[] = [
    {
      key: "cash",
      label: "Cash",
      salesFils: sum(closings.map((c) => c.cashSalesFils)),
      orders: sum(closings.map((c) => c.cashOrders)),
    },
    {
      key: "card",
      label: "Card",
      salesFils: sum(closings.map((c) => c.cardSalesFils)),
      orders: sum(closings.map((c) => c.cardOrders)),
    },
    {
      key: "benefitpay",
      label: "BenefitPay",
      salesFils: sum(closings.map((c) => c.benefitpaySalesFils)),
      orders: sum(closings.map((c) => c.benefitpayOrders)),
    },
    {
      key: "delivery",
      label: "Delivery apps",
      salesFils: sum(closings.map((c) => c.deliverySalesFils)),
      orders: 0, // filled from platform lines below
    },
  ];

  const deliveryLines = await listDeliveryLinesForClosings(
    db,
    closings.map((c) => c.id),
  );
  const platformNames = new Map(platforms.map((p) => [p.id, p.name]));
  const platformAgg = new Map<string, RevenuePlatformLine>();
  for (const line of deliveryLines) {
    const agg = platformAgg.get(line.platformId) ?? {
      platformId: line.platformId,
      name: platformNames.get(line.platformId) ?? "Unknown platform",
      salesFils: 0,
      orders: 0,
    };
    agg.salesFils += line.salesFils;
    agg.orders += line.orders;
    platformAgg.set(line.platformId, agg);
  }
  const deliveryPlatforms = [...platformAgg.values()].sort(
    (a, b) => b.salesFils - a.salesFils,
  );
  methods[3].orders = sum(deliveryPlatforms.map((p) => p.orders));

  const revenue = {
    grossSalesFils: sum(closings.map((c) => c.grossSalesFils)),
    discountFils: sum(closings.map((c) => c.discountFils)),
    totalOrders: sum(closings.map((c) => c.totalOrders)),
    methods,
    deliveryPlatforms,
    cashVarianceFils: sum(closings.map((c) => c.cashVarianceFils)),
    closingsCount: closings.length,
    daysInPeriod: daysBetween(fromInclusive, toExclusive),
  };

  // ---- COGS (usage ledger, POS deductions only) ---------------------------
  const posUsage = usage.filter((u) => u.sourceType === "pos_import");
  const cogsTotalFils = sum(posUsage.map((u) => u.cogsFils));

  const productNames = new Map(products.map((p) => [p.id, p.name]));
  const itemById = new Map(items.map((i) => [i.id, i]));

  // Units sold + sale amounts per product, from the period's POS sales rows.
  const salesRows = await listSalesRowsForImports(
    db,
    imports.map((i) => i.id),
  );
  const soldByProduct = new Map<string, { units: number; salesFils: number }>();
  for (const row of salesRows) {
    if (!row.productId || row.status !== "mapped") continue;
    const agg = soldByProduct.get(row.productId) ?? { units: 0, salesFils: 0 };
    agg.units += row.qtySold;
    agg.salesFils += row.amountFils;
    soldByProduct.set(row.productId, agg);
  }

  const byProductMap = new Map<string, CogsProductLine>();
  const byGroupMap = new Map<string, CogsGroupLine>();
  const byItemMap = new Map<string, CogsItemLine>();
  let unattributedFils = 0;

  for (const u of posUsage) {
    if (u.productId) {
      const line = byProductMap.get(u.productId) ?? {
        productId: u.productId,
        name: productNames.get(u.productId) ?? "Deleted product",
        groupName: u.productGroupName ?? "Ungrouped",
        unitsSold: soldByProduct.get(u.productId)?.units ?? 0,
        salesFils: soldByProduct.get(u.productId)?.salesFils ?? 0,
        cogsFils: 0,
      };
      line.cogsFils += u.cogsFils;
      byProductMap.set(u.productId, line);
    } else {
      unattributedFils += u.cogsFils;
    }

    const groupName = u.productId
      ? (u.productGroupName ?? "Ungrouped")
      : "Unattributed (before per-product tracking)";
    const group = byGroupMap.get(groupName) ?? { name: groupName, cogsFils: 0 };
    group.cogsFils += u.cogsFils;
    byGroupMap.set(groupName, group);

    const item = itemById.get(u.inventoryItemId);
    const itemLine = byItemMap.get(u.inventoryItemId) ?? {
      inventoryItemId: u.inventoryItemId,
      name: item?.name ?? "Deleted item",
      baseUnit: item?.baseUnit ?? "",
      qtyBase: 0,
      cogsFils: 0,
    };
    itemLine.qtyBase += u.qtyBase;
    itemLine.cogsFils += u.cogsFils;
    byItemMap.set(u.inventoryItemId, itemLine);
  }

  const cogs = {
    totalFils: cogsTotalFils,
    byProduct: [...byProductMap.values()].sort((a, b) => b.cogsFils - a.cogsFils),
    byGroup: [...byGroupMap.values()].sort((a, b) => b.cogsFils - a.cogsFils),
    byItem: [...byItemMap.values()].sort((a, b) => b.cogsFils - a.cogsFils),
    unattributedFils,
    complimentaryCostFils: sum(compLogs.map((l) => l.costFils)),
    complimentaryValueFils: sum(compLogs.map((l) => l.amountFils)),
    complimentaryCount: compLogs.length,
    importsCount: imports.length,
  };

  // ---- Losses (waste + count shrinkage, from the ledger) ------------------
  // Deliberately keyed on sourceType, NOT usage_class. Stock the owner
  // reclassified as "used" or "sold" still left the shelf and must still be
  // subtracted from profit — reclassification only moves value between the
  // Losses report's buckets, so net profit is unchanged by it.
  const wasteFils = sum(
    usage.filter((u) => u.sourceType === "waste").map((u) => u.cogsFils),
  );
  const countShrinkFils = sum(
    usage.filter((u) => u.sourceType === "count").map((u) => u.cogsFils),
  );
  const losses = {
    wasteFils,
    countShrinkFils,
    totalFils: wasteFils + countShrinkFils,
  };

  // ---- Expenses by category -----------------------------------------------
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    for (const line of e.lines) {
      byCategory.set(
        line.category,
        (byCategory.get(line.category) ?? 0) + line.amountFils,
      );
    }
  }
  const expensesByCategory = [...byCategory.entries()]
    .map(([category, amountFils]) => ({ category, amountFils }))
    .sort((a, b) => b.amountFils - a.amountFils);
  const expensesTotalFils = sum(expenses.map((e) => e.totalFils));

  // ---- Fees ----------------------------------------------------------------
  // Delivery: the configured commission accrued per sales day (the "should
  // have" side of the settlement ledger). Card/BenefitPay have no configured
  // rate, so their cost is the recorded commission entries; recorded DELIVERY
  // entries are excluded here to avoid double-counting the accrual.
  const deliveryCommissionFils = sum(
    autoSettlements
      .filter((s) => s.channel === "delivery")
      .map((s) => s.feeFils ?? 0),
  );
  const recordedFeesFils = sum(
    commissionEntries
      .filter((c) => c.channel !== "delivery")
      .map((c) => c.amountFils),
  );
  const fees = {
    deliveryCommissionFils,
    recordedFeesFils,
    totalFils: deliveryCommissionFils + recordedFeesFils,
  };

  // ---- Other P&L movements (owner-marked; excludes expense postings) ------
  const otherMovements = plMovements.filter((m) => m.sourceType !== "expense");
  const inFils = sum(
    otherMovements.filter((m) => m.direction === "in").map((m) => m.amountFils),
  );
  const outFils = sum(
    otherMovements.filter((m) => m.direction === "out").map((m) => m.amountFils),
  );
  const otherPl = { inFils, outFils, netFils: inFils - outFils };

  // ---- Rollup ---------------------------------------------------------------
  const grossProfitFils = revenue.grossSalesFils - cogs.totalFils;
  const netProfitFils =
    grossProfitFils -
    expensesTotalFils -
    fees.totalFils -
    losses.totalFils +
    otherPl.netFils;

  return {
    fromInclusive,
    toInclusive,
    revenue,
    cogs,
    losses,
    expensesTotalFils,
    expensesByCategory,
    fees,
    otherPl,
    summary: {
      grossSalesFils: revenue.grossSalesFils,
      cogsFils: cogs.totalFils,
      grossProfitFils,
      expensesFils: expensesTotalFils,
      feesFils: fees.totalFils,
      lossesFils: losses.totalFils,
      otherPlNetFils: otherPl.netFils,
      netProfitFils,
    },
  };
}
