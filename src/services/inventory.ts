import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CostingMethod,
  InventoryItem,
  InventoryItemWithSubmitter,
} from "@/types/inventory";
import type {
  InventoryItemCreateInput,
  WorkerInventoryItemCreateInput,
} from "@/lib/validators/inventory";
import type { InventoryItemOps } from "@/types/inventory";
import {
  listInventoryItems,
  getInventoryItem,
  insertInventoryItem,
  updateInventoryItem,
  voidInventoryItem,
  insertWorkerInventoryItem,
  updateWorkerInventoryItem,
  deleteWorkerInventoryItem,
  listPendingInventoryItems,
  updateInventoryItemReview,
} from "@/repositories/inventory-items";
import {
  getInventoryItemOps,
  listMyInventoryItemsOps,
} from "@/repositories/worker-inventory";

export async function getAllItems(
  db: SupabaseClient,
): Promise<InventoryItem[]> {
  return listInventoryItems(db);
}

export async function getItem(
  db: SupabaseClient,
  id: string,
): Promise<InventoryItem | null> {
  return getInventoryItem(db, id);
}

export async function createItem(
  db: SupabaseClient,
  input: InventoryItemCreateInput,
  createdBy: string,
): Promise<InventoryItem> {
  return insertInventoryItem(db, input, createdBy);
}

export async function editItem(
  db: SupabaseClient,
  id: string,
  input: Partial<InventoryItemCreateInput>,
): Promise<InventoryItem> {
  return updateInventoryItem(db, id, input);
}

export async function removeItem(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return voidInventoryItem(db, id);
}

// ---------- Worker authoring (immediately usable, owner-reviewed) ------------

/** Worker creates an item — no cost, flagged needs_review, usable immediately. */
export async function createWorkerItem(
  db: SupabaseClient,
  input: WorkerInventoryItemCreateInput,
  createdBy: string,
): Promise<void> {
  return insertWorkerInventoryItem(db, input, createdBy);
}

/** Worker edits their own still-pending item (RLS enforces own + needs_review). */
export async function editWorkerItem(
  db: SupabaseClient,
  id: string,
  input: Partial<WorkerInventoryItemCreateInput>,
): Promise<void> {
  return updateWorkerInventoryItem(db, id, input);
}

/** Worker deletes their own still-pending item (RLS enforces own + needs_review). */
export async function removeWorkerItem(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteWorkerInventoryItem(db, id);
}

/** A worker's own item submissions (cost-free), for their index page. */
export async function getMyItems(
  db: SupabaseClient,
  createdBy: string,
): Promise<InventoryItemOps[]> {
  return listMyInventoryItemsOps(db, createdBy);
}

/** Cost-free load of one item for a worker edit form. */
export async function getItemOps(
  db: SupabaseClient,
  id: string,
): Promise<InventoryItemOps | null> {
  return getInventoryItemOps(db, id);
}

// ---------- Owner review ----------------------------------------------------

export async function getPendingInventoryItems(
  db: SupabaseClient,
): Promise<InventoryItemWithSubmitter[]> {
  return listPendingInventoryItems(db);
}

/** Owner approves a worker item, supplying its real cost. Guards one-shot review. */
export async function approveInventoryItem(
  db: SupabaseClient,
  id: string,
  reviewedBy: string,
  cost: { defaultCostFils: number; costingMethod: CostingMethod },
): Promise<InventoryItem> {
  const item = await getInventoryItem(db, id);
  if (!item) throw new Error("Item not found");
  if (item.status !== "needs_review") {
    throw new Error("This item has already been reviewed");
  }
  return updateInventoryItemReview(db, id, "approved", reviewedBy, cost);
}

/** Owner rejects a worker item (voided; excluded from lists and recipes). */
export async function rejectInventoryItem(
  db: SupabaseClient,
  id: string,
  reviewedBy: string,
): Promise<InventoryItem> {
  const item = await getInventoryItem(db, id);
  if (!item) throw new Error("Item not found");
  if (item.status !== "needs_review") {
    throw new Error("This item has already been reviewed");
  }
  return updateInventoryItemReview(db, id, "voided", reviewedBy);
}
