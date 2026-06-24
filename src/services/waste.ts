import type { SupabaseClient } from "@supabase/supabase-js";
import type { WasteLog, WasteLogWithDetails } from "@/types/inventory";
import type { WasteLogCreateInput } from "@/lib/validators/waste";
import {
  insertWasteLog,
  listWasteLogs,
  listPendingWasteLogs,
  listWorkerTodayWaste,
  getWasteLog,
  updateWasteStatus,
  deleteWasteLog,
} from "@/repositories/waste";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { consumeStock } from "@/lib/calculations/costing";

/**
 * Worker logs waste. The quantity arrives in the item's stock unit and is
 * converted to base units here (workers read the cost-free ops view). The entry
 * is created as needs_review; inventory is NOT touched until the owner approves.
 */
export async function logWaste(
  db: SupabaseClient,
  input: WasteLogCreateInput,
  createdBy: string,
): Promise<WasteLog> {
  const items = await listInventoryItemsOps(db);
  const item = items.find((i) => i.id === input.inventoryItemId);
  if (!item) throw new Error("Inventory item not found");

  const baseQty = input.stockQty * item.basePerStock;

  return insertWasteLog(db, {
    inventoryItemId: input.inventoryItemId,
    baseQty,
    reason: input.reason,
    notes: input.notes,
    createdBy,
  });
}

export async function getAllWaste(
  db: SupabaseClient,
): Promise<WasteLogWithDetails[]> {
  return listWasteLogs(db);
}

export async function getPendingWaste(
  db: SupabaseClient,
): Promise<WasteLogWithDetails[]> {
  return listPendingWasteLogs(db);
}

export async function getWorkerTodayWaste(
  db: SupabaseClient,
  userId: string,
): Promise<WasteLog[]> {
  return listWorkerTodayWaste(db, userId);
}

export async function deleteOwnWaste(
  db: SupabaseClient,
  logId: string,
  userId: string,
): Promise<void> {
  const log = await getWasteLog(db, logId);
  if (!log) throw new Error("Waste log not found");
  if (log.createdBy !== userId) {
    throw new Error("You can only delete your own logs");
  }
  if (log.status !== "needs_review") {
    throw new Error("Can only delete pending logs");
  }
  await deleteWasteLog(db, logId);
}

/**
 * Owner reviews a waste entry. Approving consumes the wasted quantity from
 * inventory at weighted-average cost and records the consumed value as the
 * loss. The consumed quantity is clamped to what is actually on hand (stock may
 * have moved since the worker logged it). Rejecting voids the entry with no
 * inventory change.
 */
export async function reviewWaste(
  db: SupabaseClient,
  id: string,
  action: "approve" | "reject",
  reviewedBy: string,
): Promise<void> {
  const log = await getWasteLog(db, id);
  if (!log) throw new Error("Waste log not found");
  if (log.status !== "needs_review") {
    throw new Error("Log is not pending review");
  }

  if (action === "reject") {
    await updateWasteStatus(db, id, "voided", reviewedBy, 0);
    return;
  }

  const item = await getInventoryItem(db, log.inventoryItemId);
  if (!item) throw new Error("Inventory item not found");

  let lossFils = 0;
  const consumeQty = Math.min(log.baseQty, item.stockBaseQty);
  if (consumeQty > 0) {
    const { state, cogsFils } = consumeStock(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      consumeQty,
    );
    lossFils = cogsFils;
    await adjustStock(db, item.id, state.baseQty, state.valueFils);
  }

  await updateWasteStatus(db, id, "approved", reviewedBy, lossFils);
}
