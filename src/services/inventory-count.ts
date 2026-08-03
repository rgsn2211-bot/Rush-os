import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryCount,
  InventoryCountSummary,
  InventoryCountWithItems,
} from "@/types/inventory";
import type {
  InventoryCountCreateInput,
  InventoryCountEditInput,
} from "@/lib/validators/inventory-count";
import {
  insertInventoryCount,
  insertInventoryCountItems,
  listInventoryCounts,
  listPendingInventoryCounts,
  listWorkerOwnCounts,
  getInventoryCount,
  getInventoryCountItems,
  updateInventoryCountStatus,
  updateInventoryCountItemValue,
  updateInventoryCountMeta,
  deleteInventoryCount,
  deleteInventoryCountItems,
  enrichInventoryCountItems,
} from "@/repositories/inventory-counts";
import {
  getInventoryItem,
  adjustStock,
  listInventoryItems,
} from "@/repositories/inventory-items";
import {
  insertUsageRows,
  listUsageBySource,
  deleteUsageBySource,
  type InsertInventoryUsageInput,
} from "@/repositories/inventory-usage";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { reconcileCount, stockToBaseQty } from "@/lib/calculations/costing";
import { todayInBahrain } from "@/lib/dates";

/**
 * Worker submits a physical stock count. Each line's quantity arrives in the
 * item's stock unit and is converted to base units here (workers read the
 * cost-free ops view, which carries the current on-hand we snapshot as the
 * "expected" amount). The session is created as needs_review; inventory is NOT
 * touched until the owner approves. Counting is blind, but we still snapshot the
 * expected on-hand server-side so the owner can review the variance.
 */
export async function submitCount(
  db: SupabaseClient,
  input: InventoryCountCreateInput,
  createdBy: string,
): Promise<InventoryCount> {
  const items = await listInventoryItemsOps(db);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const lines = input.items.map((line) => {
    const item = itemMap.get(line.inventoryItemId);
    if (!item) {
      throw new Error("Inventory item not found");
    }
    const expectedBaseQty = item.stockBaseQty;
    const countedBaseQty = stockToBaseQty(
      line.countedStockQty,
      item.basePerStock,
    );
    return {
      inventoryItemId: line.inventoryItemId,
      expectedBaseQty,
      countedBaseQty,
      varianceBaseQty: countedBaseQty - expectedBaseQty,
    };
  });

  const count = await insertInventoryCount(db, {
    notes: input.notes,
    effectiveOn: input.effectiveOn ?? todayInBahrain(),
    createdBy,
  });

  await insertInventoryCountItems(
    db,
    lines.map((l) => ({ ...l, countId: count.id })),
  );

  return count;
}

export async function getAllCounts(
  db: SupabaseClient,
): Promise<InventoryCountSummary[]> {
  return listInventoryCounts(db);
}

export async function getPendingCounts(
  db: SupabaseClient,
): Promise<InventoryCountSummary[]> {
  return listPendingInventoryCounts(db);
}

export async function getWorkerOwnCounts(
  db: SupabaseClient,
  userId: string,
): Promise<InventoryCount[]> {
  return listWorkerOwnCounts(db, userId);
}

/** A session with its enriched lines and submitter, for the owner detail view. */
export async function getCountWithItems(
  db: SupabaseClient,
  id: string,
): Promise<InventoryCountWithItems | null> {
  const count = await getInventoryCount(db, id);
  if (!count) return null;

  const lines = await getInventoryCountItems(db, id);
  const items = await enrichInventoryCountItems(db, lines);

  let submitterName: string | null = null;
  if (count.createdBy) {
    const { data: profile } = await db
      .from("profiles")
      .select("display_name")
      .eq("id", count.createdBy)
      .single();
    submitterName = profile?.display_name ?? null;
  }

  return { ...count, items, submitterName };
}

export async function deleteOwnCount(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const count = await getInventoryCount(db, id);
  if (!count) throw new Error("Count not found");
  if (count.createdBy !== userId) {
    throw new Error("You can only delete your own counts");
  }
  if (count.status !== "needs_review") {
    throw new Error("Can only delete pending counts");
  }
  await deleteInventoryCount(db, id);
}

/**
 * Reconcile every line of a session: each item's on-hand is SET to the counted
 * quantity and revalued at its current weighted-average cost (the physical
 * count is the source of truth, so this is an absolute set, correct even if
 * stock drifted since submission). The value change is stored per line —
 * negative for a shortage (shrinkage loss), positive for an overage — and each
 * non-zero variance writes a usage-ledger row.
 *
 * Ledger rows are dated by the count's `effectiveOn` business date, NOT the day
 * this runs, so a count of last month's shelves reports its shrinkage in last
 * month.
 *
 * Shared by the approval path and the approved-count editor, which reverts
 * first and then calls this again.
 */
async function applyCountReconciliation(
  db: SupabaseClient,
  count: InventoryCount,
): Promise<void> {
  const lines = await getInventoryCountItems(db, count.id);
  const usageRows: InsertInventoryUsageInput[] = [];
  const occurredOn = count.effectiveOn ?? todayInBahrain();

  for (const line of lines) {
    const item = await getInventoryItem(db, line.inventoryItemId);
    if (!item) continue; // item voided/removed since submission — skip its line

    // Reconcile against the LIVE on-hand (stock may have drifted since the
    // worker snapshotted the expected amount) — the physical count wins.
    const liveVarianceBaseQty = line.countedBaseQty - item.stockBaseQty;

    const { state, varianceFils } = reconcileCount(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      line.countedBaseQty,
      item.defaultCostFils,
    );

    await adjustStock(db, item.id, state.baseQty, state.valueFils);
    await updateInventoryCountItemValue(db, line.id, varianceFils);

    // Ledger convention: shrinkage (stock lost) is positive consumed qty and
    // positive cost; an overage is negative (stock gained back value).
    if (liveVarianceBaseQty !== 0) {
      usageRows.push({
        occurredOn,
        sourceType: "count",
        sourceId: count.id,
        inventoryItemId: item.id,
        qtyBase: -liveVarianceBaseQty,
        cogsFils: -varianceFils,
        // Stock missing is shrinkage; stock found is an overage, which is not
        // consumption at all.
        usageClass: -varianceFils >= 0 ? "shrinkage" : "overage",
      });
    }
  }

  await insertUsageRows(db, usageRows);
}

/**
 * Undo an approved count's stock effects from its ledger rows and clear them.
 * The rows store the exact deltas applied at approval, so adding them back is
 * correct even if stock has moved (or gone negative) since.
 *
 * Shared by the void action and the approved-count editor.
 */
async function revertCountStock(
  db: SupabaseClient,
  countId: string,
): Promise<void> {
  const rows = await listUsageBySource(db, "count", countId);
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
  await deleteUsageBySource(db, "count", countId);
}

/**
 * Owner reviews a count session. Approving reconciles stock to the counted
 * quantities; rejecting voids the session with no inventory change.
 */
export async function reviewCount(
  db: SupabaseClient,
  id: string,
  action: "approve" | "reject",
  reviewedBy: string,
): Promise<void> {
  const count = await getInventoryCount(db, id);
  if (!count) throw new Error("Count not found");
  if (count.status !== "needs_review") {
    throw new Error("Count is not pending review");
  }

  if (action === "reject") {
    await updateInventoryCountStatus(db, id, "voided", reviewedBy);
    return;
  }

  await applyCountReconciliation(db, count);
  await updateInventoryCountStatus(db, id, "approved", reviewedBy);
}

/**
 * Replace a session's lines with the owner's corrected set. Items already on
 * the count keep their original `expected` snapshot (that is what the worker
 * actually found the shelf showing); an item the owner adds snapshots the live
 * on-hand instead.
 */
async function replaceCountLines(
  db: SupabaseClient,
  countId: string,
  input: InventoryCountEditInput,
): Promise<void> {
  const [existing, items] = await Promise.all([
    getInventoryCountItems(db, countId),
    listInventoryItems(db),
  ]);

  const expectedByItem = new Map(
    existing.map((l) => [l.inventoryItemId, l.expectedBaseQty]),
  );
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const lines = input.items.map((line) => {
    const item = itemMap.get(line.inventoryItemId);
    if (!item) throw new Error("Inventory item not found");

    const countedBaseQty = stockToBaseQty(
      line.countedStockQty,
      item.basePerStock,
    );
    const expectedBaseQty =
      expectedByItem.get(line.inventoryItemId) ?? item.stockBaseQty;

    return {
      countId,
      inventoryItemId: line.inventoryItemId,
      expectedBaseQty,
      countedBaseQty,
      varianceBaseQty: countedBaseQty - expectedBaseQty,
    };
  });

  await deleteInventoryCountItems(db, countId);
  await insertInventoryCountItems(db, lines);
}

/**
 * Owner corrects a count. Nothing here is destructive to the record — the
 * session keeps its identity, submitter and status.
 *
 * - Pending: only the stored numbers change; stock is untouched until approval.
 * - Approved: the count's stock effects are reverted from its ledger rows, the
 *   lines are replaced, and the reconciliation is re-applied. Because
 *   reconciliation is an ABSOLUTE set, this lands on exactly the corrected
 *   quantities from whatever the stock is now. Changing only `effectiveOn`
 *   re-dates the ledger rows through the same path, so a loss booked to the
 *   wrong month can be moved after the fact.
 */
export async function editCount(
  db: SupabaseClient,
  id: string,
  input: InventoryCountEditInput,
  reviewedBy: string,
): Promise<void> {
  const count = await getInventoryCount(db, id);
  if (!count) throw new Error("Count not found");
  if (count.status !== "needs_review" && count.status !== "approved") {
    throw new Error("Only pending or approved counts can be edited");
  }

  if (count.status === "approved") {
    await revertCountStock(db, id);
  }

  await updateInventoryCountMeta(db, id, {
    notes: input.notes,
    effectiveOn: input.effectiveOn,
  });
  await replaceCountLines(db, id, input);

  if (count.status === "approved") {
    const updated = await getInventoryCount(db, id);
    if (!updated) throw new Error("Count not found");
    await applyCountReconciliation(db, updated);
    await updateInventoryCountStatus(db, id, "approved", reviewedBy);
  }
}

/**
 * Owner removes a count RECORD while keeping the stock where the count put it.
 * This is for the owner's "use the count to fix stock, then clean up" flow:
 * the count's ledger rows are deleted (so variance/loss reports no longer
 * include it) and the count itself is hard-deleted (lines cascade). The stock
 * adjustment it made is intentionally NOT reversed.
 */
export async function deleteCountAsOwner(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const count = await getInventoryCount(db, id);
  if (!count) throw new Error("Count not found");

  await deleteUsageBySource(db, "count", id);
  await deleteInventoryCount(db, id);
}

/**
 * Owner voids an APPROVED count that was a genuine mis-entry, reversing its
 * stock effects. Each item's stock/value delta is reversed from the count's
 * usage-ledger rows (the exact deltas applied at approval — additive, so
 * correct even if stock has moved since). The record is kept as voided.
 */
export async function voidApprovedCount(
  db: SupabaseClient,
  id: string,
  reviewedBy: string,
): Promise<void> {
  const count = await getInventoryCount(db, id);
  if (!count) throw new Error("Count not found");
  if (count.status !== "approved") {
    throw new Error("Only approved counts can be voided");
  }

  await revertCountStock(db, id);
  await updateInventoryCountStatus(db, id, "voided", reviewedBy);
}
