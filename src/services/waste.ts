import type { SupabaseClient } from "@supabase/supabase-js";
import type { WasteLog, WasteLogWithDetails } from "@/types/inventory";
import type {
  WasteLogCreateInput,
  WasteLogBatchCreateInput,
} from "@/lib/validators/waste";
import {
  insertWasteLog,
  listWasteLogs,
  listPendingWasteLogs,
  listWorkerTodayWaste,
  getWasteLog,
  getWasteLogWithDetails,
  updateWasteStatus,
  deleteWasteLog,
} from "@/repositories/waste";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
import {
  insertUsageRows,
  listUsageBySource,
  deleteUsageBySource,
} from "@/repositories/inventory-usage";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import {
  consumeStockAllowNegative,
  stockToBaseQty,
} from "@/lib/calculations/costing";
import { fallbackUnitCostFils } from "@/services/inventory-costing";
import { todayInBahrain } from "@/lib/dates";

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

  const baseQty = stockToBaseQty(input.stockQty, item.basePerStock);

  return insertWasteLog(db, {
    inventoryItemId: input.inventoryItemId,
    baseQty,
    reason: input.reason,
    notes: input.notes,
    effectiveOn: input.effectiveOn ?? todayInBahrain(),
    createdBy,
  });
}

/**
 * Worker logs several wasted items at once. Each line is validated and stored as
 * its own waste_log row (status needs_review); inventory is not touched until the
 * owner approves each one. Item lookups are shared so the ops view is read once.
 */
export async function logWasteBatch(
  db: SupabaseClient,
  input: WasteLogBatchCreateInput,
  createdBy: string,
): Promise<WasteLog[]> {
  const items = await listInventoryItemsOps(db);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const created: WasteLog[] = [];
  for (const line of input.items) {
    const item = itemMap.get(line.inventoryItemId);
    if (!item) throw new Error("Inventory item not found");

    const baseQty = stockToBaseQty(line.stockQty, item.basePerStock);
    const log = await insertWasteLog(db, {
      inventoryItemId: line.inventoryItemId,
      baseQty,
      reason: line.reason,
      notes: line.notes,
      effectiveOn: line.effectiveOn ?? todayInBahrain(),
      createdBy,
    });
    created.push(log);
  }

  return created;
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
 * Owner reviews a waste entry. Approving consumes the FULL wasted quantity from
 * inventory at weighted-average cost and records the consumed value as the
 * loss — the waste already happened in the real world, so if the system's
 * on-hand number is behind, the stock goes negative rather than the loss being
 * understated (negative items raise an owner alert). Rejecting voids the entry
 * with no inventory change.
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

  const { state, cogsFils } = consumeStockAllowNegative(
    { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
    log.baseQty,
    fallbackUnitCostFils(item),
  );
  await adjustStock(db, item.id, state.baseQty, state.valueFils);

  await updateWasteStatus(db, id, "approved", reviewedBy, cogsFils, log.baseQty);

  // Record the loss in the usage ledger so waste shows up in COGS/loss
  // reports; consumed_base_qty on the log makes a later owner void exact.
  await insertUsageRows(db, [
    {
      // The business date the loss belongs to, not the day it was approved.
      occurredOn: log.effectiveOn ?? todayInBahrain(),
      sourceType: "waste",
      sourceId: id,
      inventoryItemId: item.id,
      qtyBase: log.baseQty,
      cogsFils,
    },
  ]);
}

/** One waste log with item + submitter details, for the owner detail page. */
export async function getWasteDetails(
  db: SupabaseClient,
  id: string,
): Promise<WasteLogWithDetails | null> {
  return getWasteLogWithDetails(db, id);
}

/**
 * Owner voids an APPROVED waste entry (a mistaken approval). The stock and
 * value it consumed are restored exactly from the entry's usage-ledger rows
 * (additive, so it is correct even if stock moved — or went negative — since),
 * the ledger rows are removed so reports no longer count the loss, and the
 * entry is kept as a voided audit record.
 *
 * Entries approved before consumption tracking restore the logged quantity at
 * the recorded loss value — the best information that exists for them.
 */
export async function voidApprovedWaste(
  db: SupabaseClient,
  id: string,
  reviewedBy: string,
): Promise<void> {
  const log = await getWasteLog(db, id);
  if (!log) throw new Error("Waste log not found");
  if (log.status !== "approved") {
    throw new Error("Only approved waste can be voided");
  }

  const rows = await listUsageBySource(db, "waste", id);
  if (rows.length === 0) {
    throw new Error(
      "This entry has no usage record to reverse — adjust the item's stock with a count instead",
    );
  }

  for (const row of rows) {
    const item = await getInventoryItem(db, row.inventoryItemId);
    if (!item) continue;
    await adjustStock(
      db,
      item.id,
      item.stockBaseQty + row.qtyBase,
      item.stockValueFils + row.cogsFils,
    );
  }

  await deleteUsageBySource(db, "waste", id);
  await updateWasteStatus(db, id, "voided", reviewedBy, log.valueFils);
}
