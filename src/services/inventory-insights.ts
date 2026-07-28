import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryItem, Supplier } from "@/types/inventory";
import {
  computeItemInsight,
  type ItemInsight,
} from "@/lib/calculations/consumption";
import { addDays, todayInBahrain } from "@/lib/dates";
import { listUsageBetween } from "@/repositories/inventory-usage";
import { listInventoryItems } from "@/repositories/inventory-items";
import { listSuppliers } from "@/repositories/suppliers";

export interface InventoryItemInsight extends ItemInsight {
  item: InventoryItem;
  supplierName: string | null;
}

export interface InventoryInsights {
  /** Items that should be reordered now, soonest stock-out first. */
  reorderSoon: InventoryItemInsight[];
  /** Items ranked by 30-day consumption cost, biggest first. */
  fastMovers: InventoryItemInsight[];
  /** Every active item's insight (for the full table). */
  all: InventoryItemInsight[];
  generatedOn: string;
}

/**
 * Consumption rates, stock-out predictions, and reorder suggestions per item,
 * derived from the trailing 30 days of the usage ledger. Count variances are
 * excluded — shrinkage is not demand and would skew the rates.
 */
export async function getInventoryInsights(
  db: SupabaseClient,
): Promise<InventoryInsights> {
  const today = todayInBahrain();
  const from = addDays(today, -29);
  const toExclusive = addDays(today, 1);

  const [usage, items, suppliers] = await Promise.all([
    listUsageBetween(db, from, toExclusive, ["pos_import", "waste"]),
    listInventoryItems(db),
    listSuppliers(db),
  ]);

  const supplierById = new Map<string, Supplier>(
    suppliers.map((s) => [s.id, s]),
  );
  const eventsByItem = new Map<string, typeof usage>();
  for (const u of usage) {
    const arr = eventsByItem.get(u.inventoryItemId) ?? [];
    arr.push(u);
    eventsByItem.set(u.inventoryItemId, arr);
  }

  const all: InventoryItemInsight[] = items.map((item) => {
    const supplier = item.supplierId
      ? supplierById.get(item.supplierId)
      : undefined;
    const insight = computeItemInsight({
      events: (eventsByItem.get(item.id) ?? []).map((u) => ({
        occurredOn: u.occurredOn,
        qtyBase: u.qtyBase,
        cogsFils: u.cogsFils,
      })),
      today,
      stockBaseQty: item.stockBaseQty,
      leadTimeDays: supplier?.leadTimeDays ?? 0,
      safetyDays: item.safetyDays,
      unitsPerPurchase: item.unitsPerPurchase,
      basePerStock: item.basePerStock,
    });
    return { ...insight, item, supplierName: supplier?.name ?? null };
  });

  const reorderSoon = all
    .filter((i) => i.reorder)
    .sort(
      (a, b) => (a.daysToStockout ?? Infinity) - (b.daysToStockout ?? Infinity),
    );

  const fastMovers = [...all]
    .filter((i) => i.cogs30Fils > 0)
    .sort((a, b) => b.cogs30Fils - a.cogs30Fils);

  return { reorderSoon, fastMovers, all, generatedOn: today };
}
