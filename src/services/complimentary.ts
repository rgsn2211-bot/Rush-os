import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComplimentaryLog,
  ComplimentaryLogWithSubmitter,
} from "@/types/pos";
import type { ComplimentaryLogCreateInput } from "@/lib/validators/pos";
import { bhdToFils } from "@/lib/calculations/currency";
import {
  insertComplimentaryLog,
  listComplimentaryLogs,
  listPendingComplimentaryLogs,
  listWorkerTodayLogs,
  getComplimentaryLog,
  updateComplimentaryStatus,
  deleteComplimentaryLog,
} from "@/repositories/complimentary";
import { getProduct, getRecipeIngredients } from "@/repositories/products";
import { getInventoryItem } from "@/repositories/inventory-items";
import {
  recipeCostFils,
  effectiveUnitCostFils,
} from "@/lib/calculations/costing";

export async function logComplimentary(
  db: SupabaseClient,
  input: ComplimentaryLogCreateInput,
  createdBy: string,
): Promise<ComplimentaryLog> {
  let description = input.description ?? "";
  const productId = input.productId;

  if (productId) {
    const product = await getProduct(db, productId);
    if (!product) throw new Error("Product not found");
    if (!description) {
      description = product.name;
    }
  }

  if (!description) throw new Error("Description is required");

  return insertComplimentaryLog(db, {
    description,
    amountFils: bhdToFils(input.amountBhd),
    reason: input.reason,
    notes: input.notes,
    productId,
    createdBy,
  });
}

export async function getAllComplimentaryLogs(
  db: SupabaseClient,
): Promise<ComplimentaryLogWithSubmitter[]> {
  return listComplimentaryLogs(db);
}

export async function getPendingComplimentary(
  db: SupabaseClient,
): Promise<ComplimentaryLogWithSubmitter[]> {
  return listPendingComplimentaryLogs(db);
}

export async function getWorkerTodayLogs(
  db: SupabaseClient,
  userId: string,
): Promise<ComplimentaryLog[]> {
  return listWorkerTodayLogs(db, userId);
}

export async function deleteOwnComplimentary(
  db: SupabaseClient,
  logId: string,
  userId: string,
): Promise<void> {
  const log = await getComplimentaryLog(db, logId);
  if (!log) throw new Error("Complimentary log not found");
  if (log.createdBy !== userId) {
    throw new Error("You can only delete your own logs");
  }
  if (log.status !== "needs_review") {
    throw new Error("Can only delete pending logs");
  }
  await deleteComplimentaryLog(db, logId);
}

/**
 * Owner reviews a complimentary entry. Approving snapshots the product's
 * recipe cost as cost_fils (0 for "Other" entries without a product) so the
 * cost of goods given away can be reported. No inventory is deducted here —
 * complimentary items are already inside POS Sales By Item (never deduct twice).
 */
export async function reviewComplimentary(
  db: SupabaseClient,
  id: string,
  action: "approve" | "reject",
  reviewedBy: string,
): Promise<void> {
  const log = await getComplimentaryLog(db, id);
  if (!log) throw new Error("Complimentary log not found");
  if (log.status !== "needs_review") {
    throw new Error("Log is not pending review");
  }

  if (action === "reject") {
    await updateComplimentaryStatus(db, id, "voided", reviewedBy);
    return;
  }

  let costFils = 0;
  if (log.productId) {
    const recipe = await getRecipeIngredients(db, log.productId);
    const ingredientCosts = [];
    for (const ing of recipe) {
      const item = await getInventoryItem(db, ing.inventoryItemId);
      ingredientCosts.push({
        qtyBase: ing.qtyBase,
        unitCostFils: item
          ? effectiveUnitCostFils(
              { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
              item.costingMethod,
              item.defaultCostFils,
            )
          : 0,
      });
    }
    costFils = recipeCostFils(ingredientCosts);
  }

  await updateComplimentaryStatus(db, id, "approved", reviewedBy, costFils);
}
