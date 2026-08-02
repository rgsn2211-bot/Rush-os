import type { SupabaseClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/dates";
import { listUsageBetween } from "@/repositories/inventory-usage";
import { listInventoryItems } from "@/repositories/inventory-items";
import {
  usageMix,
  isHighWaste,
  emptyBuckets,
  bucketFor,
  type UsageBuckets,
  type UsageMix,
} from "@/lib/calculations/usage-mix";

export interface ItemUsageLine {
  inventoryItemId: string;
  name: string;
  baseUnit: string;
  /** Value consumed per class, in fils. */
  mix: UsageMix;
  /** Quantity wasted + gone missing, in base units. */
  lostQtyBase: number;
  /** Waste + shrinkage value — what this item cost in losses. */
  lostFils: number;
  /** Above the waste threshold and worth acting on. */
  highWaste: boolean;
}

export interface UsageReport {
  fromInclusive: string;
  toInclusive: string;
  /** Shop-wide mix across every item. */
  total: UsageMix;
  /** Per item, worst losses first. */
  items: ItemUsageLine[];
  /** Just the items over the threshold, for alerting. */
  highWasteItems: ItemUsageLine[];
}

/**
 * How inventory was consumed in a period — sold, used internally, wasted or
 * gone missing — as values and as percentages.
 *
 * The owner's question is not "how many BHD of waste" but "is this item's
 * waste normal?", which only a share of consumption can answer. Everything is
 * measured in value so items with different unit costs compare fairly.
 */
export async function getUsageReport(
  db: SupabaseClient,
  period: Period,
): Promise<UsageReport> {
  const { fromInclusive, toExclusive, toInclusive } = period;

  const [usage, items] = await Promise.all([
    listUsageBetween(db, fromInclusive, toExclusive),
    listInventoryItems(db),
  ]);

  const itemById = new Map(items.map((i) => [i.id, i]));

  const bucketsByItem = new Map<string, UsageBuckets>();
  const lostQtyByItem = new Map<string, number>();
  const shopBuckets = emptyBuckets();

  for (const row of usage) {
    const bucket = bucketFor(row.usageClass);

    const buckets = bucketsByItem.get(row.inventoryItemId) ?? emptyBuckets();
    buckets[bucket] += row.cogsFils;
    bucketsByItem.set(row.inventoryItemId, buckets);

    shopBuckets[bucket] += row.cogsFils;

    if (row.usageClass === "wasted" || row.usageClass === "shrinkage") {
      lostQtyByItem.set(
        row.inventoryItemId,
        (lostQtyByItem.get(row.inventoryItemId) ?? 0) + row.qtyBase,
      );
    }
  }

  const lines: ItemUsageLine[] = [...bucketsByItem.entries()].map(
    ([inventoryItemId, buckets]) => {
      const item = itemById.get(inventoryItemId);
      const mix = usageMix(buckets);
      return {
        inventoryItemId,
        name: item?.name ?? "Deleted item",
        baseUnit: item?.baseUnit ?? "",
        mix,
        lostQtyBase: lostQtyByItem.get(inventoryItemId) ?? 0,
        lostFils: buckets.wasted + buckets.shrinkage,
        highWaste: isHighWaste(mix),
      };
    },
  );

  lines.sort((a, b) => b.lostFils - a.lostFils);

  return {
    fromInclusive,
    toInclusive,
    total: usageMix(shopBuckets),
    items: lines,
    highWasteItems: lines.filter((l) => l.highWaste),
  };
}
