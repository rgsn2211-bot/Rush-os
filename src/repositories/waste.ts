import type { SupabaseClient } from "@supabase/supabase-js";
import type { WasteLog, WasteLogWithDetails } from "@/types/inventory";

export interface InsertWasteLogInput {
  inventoryItemId: string;
  baseQty: number;
  reason: string;
  notes?: string;
  createdBy: string;
}

export async function insertWasteLog(
  db: SupabaseClient,
  input: InsertWasteLogInput,
): Promise<WasteLog> {
  const { data, error } = await db
    .from("waste_logs")
    .insert({
      inventory_item_id: input.inventoryItemId,
      base_qty: input.baseQty,
      reason: input.reason,
      notes: input.notes ?? null,
      created_by: input.createdBy,
      status: "needs_review",
    })
    .select("*")
    .single();

  if (error) throw error;
  return toWasteLog(data);
}

export async function listWasteLogs(
  db: SupabaseClient,
): Promise<WasteLogWithDetails[]> {
  const { data, error } = await db
    .from("waste_logs")
    .select("*")
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return enrichWasteLogs(db, data.map(toWasteLog));
}

export async function listPendingWasteLogs(
  db: SupabaseClient,
): Promise<WasteLogWithDetails[]> {
  const { data, error } = await db
    .from("waste_logs")
    .select("*")
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return enrichWasteLogs(db, data.map(toWasteLog));
}

/** Non-voided waste logs that occurred on a given date, with item + submitter names. */
export async function listWasteLogsForDate(
  db: SupabaseClient,
  date: string,
): Promise<WasteLogWithDetails[]> {
  const { data, error } = await db
    .from("waste_logs")
    .select("*")
    .gte("occurred_at", `${date}T00:00:00`)
    .lt("occurred_at", `${date}T23:59:59.999`)
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return enrichWasteLogs(db, data.map(toWasteLog));
}

export async function listWorkerTodayWaste(
  db: SupabaseClient,
  userId: string,
): Promise<WasteLog[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await db
    .from("waste_logs")
    .select("*")
    .eq("created_by", userId)
    .gte("occurred_at", `${today}T00:00:00`)
    .lt("occurred_at", `${today}T23:59:59.999`)
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toWasteLog);
}

export async function getWasteLog(
  db: SupabaseClient,
  id: string,
): Promise<WasteLog | null> {
  const { data, error } = await db
    .from("waste_logs")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toWasteLog(data);
}

export async function updateWasteStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  reviewedBy: string,
  valueFils: number,
): Promise<void> {
  const { error } = await db
    .from("waste_logs")
    .update({
      status,
      value_fils: valueFils,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteWasteLog(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("waste_logs").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Add item and submitter names to a set of waste logs. Owner-only — relies on
 * owner RLS access to inventory_items and profiles. Done as two batched lookups
 * (mirrors the profile join in the complimentary repository).
 */
async function enrichWasteLogs(
  db: SupabaseClient,
  logs: WasteLog[],
): Promise<WasteLogWithDetails[]> {
  const itemIds = [...new Set(logs.map((l) => l.inventoryItemId))];
  const creatorIds = [
    ...new Set(logs.map((l) => l.createdBy).filter(Boolean)),
  ] as string[];

  const itemMap = new Map<
    string,
    { name: string; stockUnit: string; basePerStock: number }
  >();
  if (itemIds.length > 0) {
    const { data: items } = await db
      .from("inventory_items")
      .select("id, name, stock_unit, base_per_stock")
      .in("id", itemIds);
    if (items) {
      for (const it of items) {
        itemMap.set(it.id, {
          name: it.name,
          stockUnit: it.stock_unit,
          basePerStock: Number(it.base_per_stock),
        });
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

  return logs.map((l) => {
    const item = itemMap.get(l.inventoryItemId);
    return {
      ...l,
      itemName: item?.name ?? null,
      stockUnit: item?.stockUnit ?? null,
      basePerStock: item?.basePerStock ?? 1,
      submitterName: (l.createdBy && nameMap.get(l.createdBy)) ?? null,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWasteLog(row: any): WasteLog {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    baseQty: Number(row.base_qty),
    valueFils: Number(row.value_fils),
    reason: row.reason,
    notes: row.notes,
    occurredAt: row.occurred_at,
    status: row.status,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
