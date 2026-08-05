import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryCount,
  InventoryCountItem,
  InventoryCountItemWithDetails,
  InventoryCountSummary,
} from "@/types/inventory";

export interface InsertInventoryCountInput {
  notes?: string;
  /** Business date the shrinkage is reported on. */
  effectiveOn: string;
  createdBy: string;
}

export interface InsertInventoryCountItemInput {
  countId: string;
  inventoryItemId: string;
  expectedBaseQty: number;
  countedBaseQty: number;
  varianceBaseQty: number;
  /**
   * Carried across when an edit replaces a session's lines, so a line the owner
   * excluded from reports is not silently resurrected.
   */
  excludedAt?: string | null;
  excludedBy?: string | null;
  excludedKeptStock?: boolean | null;
}

export async function insertInventoryCount(
  db: SupabaseClient,
  input: InsertInventoryCountInput,
): Promise<InventoryCount> {
  const { data, error } = await db
    .from("inventory_counts")
    .insert({
      notes: input.notes ?? null,
      effective_on: input.effectiveOn,
      created_by: input.createdBy,
      status: "needs_review",
    })
    .select("*")
    .single();

  if (error) throw error;
  return toInventoryCount(data);
}

export async function insertInventoryCountItems(
  db: SupabaseClient,
  rows: InsertInventoryCountItemInput[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db.from("inventory_count_items").insert(
    rows.map((r) => ({
      count_id: r.countId,
      inventory_item_id: r.inventoryItemId,
      expected_base_qty: r.expectedBaseQty,
      counted_base_qty: r.countedBaseQty,
      variance_base_qty: r.varianceBaseQty,
      excluded_at: r.excludedAt ?? null,
      excluded_by: r.excludedBy ?? null,
      excluded_kept_stock: r.excludedKeptStock ?? null,
    })),
  );
  if (error) throw error;
}

export async function getInventoryCount(
  db: SupabaseClient,
  id: string,
): Promise<InventoryCount | null> {
  const { data, error } = await db
    .from("inventory_counts")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toInventoryCount(data);
}

export async function getInventoryCountItems(
  db: SupabaseClient,
  countId: string,
): Promise<InventoryCountItem[]> {
  const { data, error } = await db
    .from("inventory_count_items")
    .select("*")
    .eq("count_id", countId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data.map(toInventoryCountItem);
}

/** Owner: all non-voided sessions, newest first, with summary numbers. */
export async function listInventoryCounts(
  db: SupabaseClient,
): Promise<InventoryCountSummary[]> {
  const { data, error } = await db
    .from("inventory_counts")
    .select("*")
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return summarizeCounts(db, data.map(toInventoryCount));
}

/** Owner: pending sessions, newest first (for the Review Center). */
export async function listPendingInventoryCounts(
  db: SupabaseClient,
): Promise<InventoryCountSummary[]> {
  const { data, error } = await db
    .from("inventory_counts")
    .select("*")
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return summarizeCounts(db, data.map(toInventoryCount));
}

/** A worker's own sessions (recent first), for the worker page. */
export async function listWorkerOwnCounts(
  db: SupabaseClient,
  userId: string,
): Promise<InventoryCount[]> {
  const { data, error } = await db
    .from("inventory_counts")
    .select("*")
    .eq("created_by", userId)
    .neq("status", "voided")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data.map(toInventoryCount);
}

export async function updateInventoryCountStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  reviewedBy: string,
): Promise<void> {
  const { error } = await db
    .from("inventory_counts")
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Mark a line excluded from reports, or clear the exclusion (pass nulls).
 * `keptStock` records whether the line's stock adjustment was left in place.
 */
export async function updateInventoryCountItemExclusion(
  db: SupabaseClient,
  lineId: string,
  input: {
    excludedAt: string | null;
    excludedBy: string | null;
    keptStock: boolean | null;
  },
): Promise<void> {
  const { error } = await db
    .from("inventory_count_items")
    .update({
      excluded_at: input.excludedAt,
      excluded_by: input.excludedBy,
      excluded_kept_stock: input.keptStock,
    })
    .eq("id", lineId);

  if (error) throw error;
}

export async function updateInventoryCountItemValue(
  db: SupabaseClient,
  itemId: string,
  valueFils: number,
): Promise<void> {
  const { error } = await db
    .from("inventory_count_items")
    .update({ value_fils: valueFils })
    .eq("id", itemId);

  if (error) throw error;
}

/** Owner edits to the session itself (its note and the date it reports on). */
export async function updateInventoryCountMeta(
  db: SupabaseClient,
  id: string,
  input: { notes?: string | null; effectiveOn?: string },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.effectiveOn !== undefined) updates.effective_on = input.effectiveOn;
  if (Object.keys(updates).length === 0) return;

  const { error } = await db
    .from("inventory_counts")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Drop every line of a session, so the owner's edit can replace them wholesale. */
export async function deleteInventoryCountItems(
  db: SupabaseClient,
  countId: string,
): Promise<void> {
  const { error } = await db
    .from("inventory_count_items")
    .delete()
    .eq("count_id", countId);

  if (error) throw error;
}

/**
 * Sessions whose business date falls in [fromInclusive, toExclusive), with
 * their lines attached — the source for the owner's count report. Filtering on
 * effective_on (not the approval timestamp) keeps it consistent with Losses.
 */
export async function listCountsWithLinesBetween(
  db: SupabaseClient,
  fromInclusive: string,
  toExclusive: string,
): Promise<{ count: InventoryCount; lines: InventoryCountItem[] }[]> {
  const { data, error } = await db
    .from("inventory_counts")
    .select("*")
    .neq("status", "voided")
    .gte("effective_on", fromInclusive)
    .lt("effective_on", toExclusive);

  if (error) throw error;

  const counts = data.map(toInventoryCount);
  if (counts.length === 0) return [];

  const { data: lineRows, error: lineError } = await db
    .from("inventory_count_items")
    .select("*")
    .in(
      "count_id",
      counts.map((c) => c.id),
    );

  if (lineError) throw lineError;

  const byCount = new Map<string, InventoryCountItem[]>();
  for (const row of lineRows.map(toInventoryCountItem)) {
    const list = byCount.get(row.countId) ?? [];
    list.push(row);
    byCount.set(row.countId, list);
  }

  return counts.map((count) => ({
    count,
    lines: byCount.get(count.id) ?? [],
  }));
}

export async function deleteInventoryCount(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("inventory_counts").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Attach item name/unit details to a set of count lines. Owner-only — relies on
 * owner RLS access to inventory_items. One batched lookup (mirrors enrichWasteLogs).
 */
export async function enrichInventoryCountItems(
  db: SupabaseClient,
  items: InventoryCountItem[],
): Promise<InventoryCountItemWithDetails[]> {
  const itemIds = [...new Set(items.map((i) => i.inventoryItemId))];

  const itemMap = new Map<
    string,
    { name: string; stockUnit: string; basePerStock: number }
  >();
  if (itemIds.length > 0) {
    const { data: rows } = await db
      .from("inventory_items")
      .select("id, name, stock_unit, base_per_stock")
      .in("id", itemIds);
    if (rows) {
      for (const it of rows) {
        itemMap.set(it.id, {
          name: it.name,
          stockUnit: it.stock_unit,
          basePerStock: Number(it.base_per_stock),
        });
      }
    }
  }

  return items.map((line) => {
    const item = itemMap.get(line.inventoryItemId);
    return {
      ...line,
      itemName: item?.name ?? null,
      stockUnit: item?.stockUnit ?? null,
      basePerStock: item?.basePerStock ?? 1,
    };
  });
}

/**
 * Add per-session summary numbers (line count, net value change, submitter
 * name) for the owner list. Two batched lookups across all sessions.
 */
async function summarizeCounts(
  db: SupabaseClient,
  counts: InventoryCount[],
): Promise<InventoryCountSummary[]> {
  const countIds = counts.map((c) => c.id);
  const creatorIds = [
    ...new Set(counts.map((c) => c.createdBy).filter(Boolean)),
  ] as string[];

  const tally = new Map<string, { itemCount: number; netValueFils: number }>();
  if (countIds.length > 0) {
    const { data: lines } = await db
      .from("inventory_count_items")
      .select("count_id, value_fils, excluded_at")
      .in("count_id", countIds);
    if (lines) {
      for (const l of lines) {
        const t = tally.get(l.count_id) ?? { itemCount: 0, netValueFils: 0 };
        t.itemCount += 1;
        // An excluded line still counts as counted, but its variance was
        // deliberately taken out of the numbers.
        if (!l.excluded_at) t.netValueFils += Number(l.value_fils);
        tally.set(l.count_id, t);
      }
    }
  }

  const nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) {
      for (const p of profiles) nameMap.set(p.id, p.display_name);
    }
  }

  return counts.map((c) => {
    const t = tally.get(c.id) ?? { itemCount: 0, netValueFils: 0 };
    return {
      ...c,
      submitterName: (c.createdBy && nameMap.get(c.createdBy)) ?? null,
      itemCount: t.itemCount,
      netValueFils: t.netValueFils,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toInventoryCount(row: any): InventoryCount {
  return {
    id: row.id,
    notes: row.notes,
    countedAt: row.counted_at,
    effectiveOn: row.effective_on ?? null,
    status: row.status,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toInventoryCountItem(row: any): InventoryCountItem {
  return {
    id: row.id,
    countId: row.count_id,
    inventoryItemId: row.inventory_item_id,
    expectedBaseQty: Number(row.expected_base_qty),
    countedBaseQty: Number(row.counted_base_qty),
    varianceBaseQty: Number(row.variance_base_qty),
    valueFils: Number(row.value_fils),
    excludedAt: row.excluded_at ?? null,
    excludedBy: row.excluded_by ?? null,
    excludedKeptStock:
      row.excluded_kept_stock === null || row.excluded_kept_stock === undefined
        ? null
        : Boolean(row.excluded_kept_stock),
    createdAt: row.created_at,
  };
}
