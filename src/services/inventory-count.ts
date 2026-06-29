import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryCount,
  InventoryCountSummary,
  InventoryCountWithItems,
} from "@/types/inventory";
import type { InventoryCountCreateInput } from "@/lib/validators/inventory-count";
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
  deleteInventoryCount,
  enrichInventoryCountItems,
} from "@/repositories/inventory-counts";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { reconcileCount } from "@/lib/calculations/costing";

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
    const countedBaseQty = line.countedStockQty * item.basePerStock;
    return {
      inventoryItemId: line.inventoryItemId,
      expectedBaseQty,
      countedBaseQty,
      varianceBaseQty: countedBaseQty - expectedBaseQty,
    };
  });

  const count = await insertInventoryCount(db, {
    notes: input.notes,
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
 * Owner reviews a count session. Approving reconciles every line: each item's
 * on-hand is SET to the counted quantity and revalued at its current
 * weighted-average cost (the physical count is the source of truth, so this is
 * an absolute set, correct even if stock drifted since submission). The value
 * change is stored per line — negative for a shortage (shrinkage loss), positive
 * for an overage. Rejecting voids the session with no inventory change.
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

  const lines = await getInventoryCountItems(db, id);
  for (const line of lines) {
    const item = await getInventoryItem(db, line.inventoryItemId);
    if (!item) continue; // item voided/removed since submission — skip its line

    const { state, varianceFils } = reconcileCount(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      line.countedBaseQty,
      item.defaultCostFils,
    );

    await adjustStock(db, item.id, state.baseQty, state.valueFils);
    await updateInventoryCountItemValue(db, line.id, varianceFils);
  }

  await updateInventoryCountStatus(db, id, "approved", reviewedBy);
}
