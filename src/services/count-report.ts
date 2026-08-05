import type { SupabaseClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/dates";
import { listCountsWithLinesBetween } from "@/repositories/inventory-counts";
import { listInventoryItems } from "@/repositories/inventory-items";

export interface CountReportLine {
  inventoryItemId: string;
  name: string;
  stockUnit: string;
  basePerStock: number;
  expectedBaseQty: number;
  countedBaseQty: number;
  varianceBaseQty: number;
  valueFils: number;
  /** Excluded by the owner: shown for transparency, absent from every total. */
  excluded: boolean;
  /** When excluded, whether its stock adjustment was kept. */
  excludedKeptStock: boolean | null;
}

export interface CountReportSession {
  id: string;
  effectiveOn: string | null;
  countedAt: string;
  status: string;
  itemCount: number;
  /** Net value change: negative = net shortage, positive = net overage. */
  netValueFils: number;
  /** Lines with a non-zero variance, worst shortage first. */
  lines: CountReportLine[];
}

/** One item's variance summed across every count in the period. */
export interface RepeatOffender {
  inventoryItemId: string;
  name: string;
  stockUnit: string;
  basePerStock: number;
  /** How many counts in the period found a variance on this item. */
  countsWithVariance: number;
  varianceBaseQty: number;
  valueFils: number;
}

export interface CountReport {
  fromInclusive: string;
  toInclusive: string;
  sessions: CountReportSession[];
  repeatOffenders: RepeatOffender[];
  totalNetValueFils: number;
}

/**
 * Every count in a period with its per-item variance detail, plus each item's
 * cumulative variance across all of them.
 *
 * Filtered on the count's BUSINESS date (effective_on), not when it was
 * approved, so the report agrees with Losses and Profit for the same period.
 */
export async function getCountReport(
  db: SupabaseClient,
  period: Period,
): Promise<CountReport> {
  const { fromInclusive, toExclusive, toInclusive } = period;

  const [rows, items] = await Promise.all([
    listCountsWithLinesBetween(db, fromInclusive, toExclusive),
    listInventoryItems(db),
  ]);

  const itemById = new Map(items.map((i) => [i.id, i]));
  const cumulative = new Map<string, RepeatOffender>();

  const sessions: CountReportSession[] = rows.map(({ count, lines }) => {
    const detailed: CountReportLine[] = lines.map((line) => {
      const item = itemById.get(line.inventoryItemId);
      return {
        inventoryItemId: line.inventoryItemId,
        name: item?.name ?? "Deleted item",
        stockUnit: item?.stockUnit ?? "",
        basePerStock: item?.basePerStock ?? 1,
        expectedBaseQty: line.expectedBaseQty,
        countedBaseQty: line.countedBaseQty,
        varianceBaseQty: line.varianceBaseQty,
        valueFils: line.valueFils,
        excluded: line.excludedAt !== null,
        excludedKeptStock: line.excludedKeptStock,
      };
    });

    for (const line of detailed) {
      if (line.varianceBaseQty === 0) continue;
      // The owner took this variance out of the books deliberately.
      if (line.excluded) continue;
      const entry = cumulative.get(line.inventoryItemId) ?? {
        inventoryItemId: line.inventoryItemId,
        name: line.name,
        stockUnit: line.stockUnit,
        basePerStock: line.basePerStock,
        countsWithVariance: 0,
        varianceBaseQty: 0,
        valueFils: 0,
      };
      entry.countsWithVariance += 1;
      entry.varianceBaseQty += line.varianceBaseQty;
      entry.valueFils += line.valueFils;
      cumulative.set(line.inventoryItemId, entry);
    }

    return {
      id: count.id,
      effectiveOn: count.effectiveOn,
      countedAt: count.countedAt,
      status: count.status,
      itemCount: detailed.length,
      netValueFils: detailed
        .filter((l) => !l.excluded)
        .reduce((s, l) => s + l.valueFils, 0),
      // Excluded lines stay listed so the override is visible, but they carry
      // no weight in any total.
      lines: detailed
        .filter((l) => l.varianceBaseQty !== 0)
        .sort((a, b) => a.valueFils - b.valueFils),
    };
  });

  sessions.sort((a, b) =>
    (b.effectiveOn ?? b.countedAt).localeCompare(a.effectiveOn ?? a.countedAt),
  );

  return {
    fromInclusive,
    toInclusive,
    sessions,
    // Biggest shortage first — value is negative for a shortage.
    repeatOffenders: [...cumulative.values()].sort(
      (a, b) => a.valueFils - b.valueFils,
    ),
    totalNetValueFils: sessions.reduce((s, c) => s + c.netValueFils, 0),
  };
}
