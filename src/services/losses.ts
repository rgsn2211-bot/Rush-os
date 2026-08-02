import type { SupabaseClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/dates";
import type { UsageClass } from "@/types/inventory";
import {
  listUsageBetween,
  listUsageForItemBetween,
} from "@/repositories/inventory-usage";
import {
  listInventoryItems,
  getInventoryItem,
} from "@/repositories/inventory-items";
import { defaultUsageClass } from "@/services/loss-adjustments";
import { listApprovedComplimentaryBetween } from "@/repositories/complimentary";
import { listBalanceAdjustments } from "@/repositories/balance-adjustments";

export interface LossItemLine {
  inventoryItemId: string;
  name: string;
  baseUnit: string;
  qtyBase: number;
  valueFils: number;
}

export interface LossesReport {
  fromInclusive: string;
  toInclusive: string;
  wasteFils: number;
  wasteByItem: LossItemLine[];
  /** Net count variance cost: positive = shrinkage, negative = net overage. */
  countShrinkFils: number;
  countByItem: LossItemLine[];
  /**
   * Waste/shrinkage the owner adjusted out of losses because it was ordinary
   * consumption the POS could not see (napkins, an unmapped POS button). Still
   * inside COGS — only its label as a "loss" was wrong.
   */
  operationalUsageFils: number;
  operationalByItem: LossItemLine[];
  /** Cost/value of approved complimentary items (already inside POS COGS). */
  compCostFils: number;
  compValueFils: number;
  compCount: number;
  /** Balance-adjustment differences in the period. */
  adjustmentLossFils: number;
  adjustmentGainFils: number;
  adjustmentCount: number;
  /** waste + count shrinkage + net adjustment losses (comp excluded — it is
   *  already counted inside COGS). */
  totalLossFils: number;
}

/** One ledger row as the owner's drill-down shows it. */
export interface ItemLossRow {
  id: string;
  occurredOn: string;
  sourceType: string;
  usageClass: UsageClass;
  qtyBase: number;
  valueFils: number;
  reclassNote: string | null;
  /** True when the owner has adjusted this row away from its natural class. */
  isAdjusted: boolean;
}

export interface ItemLossDetail {
  inventoryItemId: string;
  name: string;
  baseUnit: string;
  stockUnit: string;
  basePerStock: number;
  fromInclusive: string;
  toInclusive: string;
  rows: ItemLossRow[];
}

/**
 * Every ledger row for one item in a period, so the owner can see exactly what
 * made up its loss and adjust the entries that were not real losses.
 */
export async function getItemLossDetail(
  db: SupabaseClient,
  inventoryItemId: string,
  period: Period,
): Promise<ItemLossDetail | null> {
  const item = await getInventoryItem(db, inventoryItemId);
  if (!item) return null;

  const rows = await listUsageForItemBetween(
    db,
    inventoryItemId,
    period.fromInclusive,
    period.toExclusive,
  );

  return {
    inventoryItemId,
    name: item.name,
    baseUnit: item.baseUnit,
    stockUnit: item.stockUnit,
    basePerStock: item.basePerStock,
    fromInclusive: period.fromInclusive,
    toInclusive: period.toInclusive,
    rows: rows
      .map((r) => ({
        id: r.id,
        occurredOn: r.occurredOn,
        sourceType: r.sourceType,
        usageClass: r.usageClass,
        qtyBase: r.qtyBase,
        valueFils: r.cogsFils,
        reclassNote: r.reclassNote,
        isAdjusted: r.usageClass !== defaultUsageClass(r),
      }))
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
  };
}

export async function getLossesReport(
  db: SupabaseClient,
  period: Period,
): Promise<LossesReport> {
  const { fromInclusive, toExclusive, toInclusive } = period;

  const [usage, items, compLogs, allAdjustments] = await Promise.all([
    listUsageBetween(db, fromInclusive, toExclusive, ["waste", "count"]),
    listInventoryItems(db),
    listApprovedComplimentaryBetween(db, fromInclusive, toExclusive),
    listBalanceAdjustments(db),
  ]);

  const itemById = new Map(items.map((i) => [i.id, i]));

  const aggregate = (predicate: (u: (typeof usage)[number]) => boolean) => {
    const byItem = new Map<string, LossItemLine>();
    let totalFils = 0;
    for (const u of usage) {
      if (!predicate(u)) continue;
      totalFils += u.cogsFils;
      const item = itemById.get(u.inventoryItemId);
      const line = byItem.get(u.inventoryItemId) ?? {
        inventoryItemId: u.inventoryItemId,
        name: item?.name ?? "Deleted item",
        baseUnit: item?.baseUnit ?? "",
        qtyBase: 0,
        valueFils: 0,
      };
      line.qtyBase += u.qtyBase;
      line.valueFils += u.cogsFils;
      byItem.set(u.inventoryItemId, line);
    }
    return {
      totalFils,
      byItem: [...byItem.values()].sort((a, b) => b.valueFils - a.valueFils),
    };
  };

  // Only rows still classed as a real loss count against the loss totals. A
  // row the owner adjusted to "used" or "sold" moved to the operational
  // bucket: the stock was genuinely consumed, it just was not lost.
  const waste = aggregate(
    (u) => u.sourceType === "waste" && u.usageClass === "wasted",
  );
  const count = aggregate(
    (u) =>
      u.sourceType === "count" &&
      (u.usageClass === "shrinkage" || u.usageClass === "overage"),
  );
  const operational = aggregate(
    (u) => u.usageClass === "used" || u.usageClass === "sold",
  );

  const adjustments = allAdjustments.filter(
    (a) => a.occurredOn >= fromInclusive && a.occurredOn < toExclusive,
  );
  const adjustmentLossFils = adjustments
    .filter((a) => a.diffFils < 0)
    .reduce((s, a) => s - a.diffFils, 0);
  const adjustmentGainFils = adjustments
    .filter((a) => a.diffFils > 0)
    .reduce((s, a) => s + a.diffFils, 0);

  return {
    fromInclusive,
    toInclusive,
    wasteFils: waste.totalFils,
    wasteByItem: waste.byItem,
    countShrinkFils: count.totalFils,
    countByItem: count.byItem,
    operationalUsageFils: operational.totalFils,
    operationalByItem: operational.byItem,
    compCostFils: compLogs.reduce((s, l) => s + l.costFils, 0),
    compValueFils: compLogs.reduce((s, l) => s + l.amountFils, 0),
    compCount: compLogs.length,
    adjustmentLossFils,
    adjustmentGainFils,
    adjustmentCount: adjustments.length,
    totalLossFils:
      waste.totalFils +
      count.totalFils +
      adjustmentLossFils -
      adjustmentGainFils,
  };
}
