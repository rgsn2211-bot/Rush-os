import type { SupabaseClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/dates";
import { listUsageBetween } from "@/repositories/inventory-usage";
import { listInventoryItems } from "@/repositories/inventory-items";
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

  const aggregate = (sourceType: "waste" | "count") => {
    const byItem = new Map<string, LossItemLine>();
    let totalFils = 0;
    for (const u of usage) {
      if (u.sourceType !== sourceType) continue;
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

  const waste = aggregate("waste");
  const count = aggregate("count");

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
