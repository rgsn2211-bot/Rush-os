import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryCount,
  InventoryCountItem,
  InventoryCountItemWithDetails,
  InventoryCountSummary,
} from "@/types/inventory";

export interface InsertInventoryCountInput {
  notes?: string;
  createdBy: string;
}

export interface InsertInventoryCountItemInput {
  countId: string;
  inventoryItemId: string;
  expectedBaseQty: number;
  countedBaseQty: number;
  varianceBaseQty: number;
}

export async function insertInventoryCount(
  db: SupabaseClient,
  input: InsertInventoryCountInput,
): Promise<InventoryCount> {
  const { data, error } = await db
    .from("inventory_counts")
    .insert({
      notes: input.notes ?? null,
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
      .select("count_id, value_fils")
      .in("count_id", countIds);
    if (lines) {
      for (const l of lines) {
        const t = tally.get(l.count_id) ?? { itemCount: 0, netValueFils: 0 };
        t.itemCount += 1;
        t.netValueFils += Number(l.value_fils);
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
    createdAt: row.created_at,
  };
}
