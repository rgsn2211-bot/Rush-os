import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Purchase,
  PurchaseItem,
  PurchaseWithSubmitter,
  ReviewStatus,
} from "@/types/inventory";
import type {
  PurchaseCreateInput,
  PurchaseApproveInput,
  WorkerPurchaseCreateInput,
} from "@/lib/validators/inventory";
import {
  insertPurchase,
  insertPurchaseItems,
  listPurchases,
  listPendingPurchases,
  getPurchase,
  getPurchaseItems,
  voidPurchase,
  approvePurchaseRecord,
  updatePurchaseItemCost,
} from "@/repositories/purchases";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { purchaseToBaseQty, receiveStock } from "@/lib/calculations/costing";

export async function getAllPurchases(
  db: SupabaseClient,
): Promise<Purchase[]> {
  return listPurchases(db);
}

export async function getPurchaseWithItems(
  db: SupabaseClient,
  id: string,
): Promise<{ purchase: Purchase; items: PurchaseItem[] } | null> {
  const purchase = await getPurchase(db, id);
  if (!purchase) return null;
  const items = await getPurchaseItems(db, id);
  return { purchase, items };
}

/**
 * Record a purchase and optionally update stock.
 *
 * When status is 'approved' (owner-entered), stock is updated immediately.
 * When status is 'needs_review' (worker submission), stock is NOT updated
 * until the owner approves via approvePurchase().
 */
export async function recordPurchase(
  db: SupabaseClient,
  input: PurchaseCreateInput,
  createdBy: string,
  status: ReviewStatus = "approved",
): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
  const itemDetails = await Promise.all(
    input.items.map(async (line) => {
      const item = await getInventoryItem(db, line.inventoryItemId);
      if (!item) {
        throw new Error(`Inventory item ${line.inventoryItemId} not found`);
      }
      const baseQty = purchaseToBaseQty(
        line.purchaseQty,
        item.unitsPerPurchase,
        item.basePerStock,
      );
      const lineTotalFils = Math.round(line.purchaseQty * line.unitCostFils);
      return { item, baseQty, lineTotalFils, line };
    }),
  );

  const totalFils = itemDetails.reduce((sum, d) => sum + d.lineTotalFils, 0);

  const purchase = await insertPurchase(db, {
    supplierId: input.supplierId ?? null,
    purchasedOn: input.purchasedOn ?? new Date().toISOString().split("T")[0],
    isPaid: input.isPaid,
    dueDate: input.dueDate ?? null,
    totalFils,
    createdBy,
    status,
  });

  const purchaseItemInputs = itemDetails.map((d) => ({
    purchaseId: purchase.id,
    inventoryItemId: d.line.inventoryItemId,
    purchaseQty: d.line.purchaseQty,
    baseQty: d.baseQty,
    unitCostFils: d.line.unitCostFils,
    lineTotalFils: d.lineTotalFils,
  }));

  const items = await insertPurchaseItems(db, purchaseItemInputs);

  if (status === "approved") {
    for (const d of itemDetails) {
      const newStock = receiveStock(
        {
          baseQty: d.item.stockBaseQty,
          valueFils: d.item.stockValueFils,
        },
        d.baseQty,
        d.lineTotalFils,
      );
      await adjustStock(db, d.item.id, newStock.baseQty, newStock.valueFils);
    }
  }

  return { purchase, items };
}

export async function getPendingPurchases(
  db: SupabaseClient,
): Promise<PurchaseWithSubmitter[]> {
  return listPendingPurchases(db);
}

export async function approvePurchase(
  db: SupabaseClient,
  purchaseId: string,
  input: PurchaseApproveInput,
): Promise<void> {
  const existing = await getPurchaseWithItems(db, purchaseId);
  if (!existing) throw new Error("Purchase not found");
  if (existing.purchase.status !== "needs_review") {
    throw new Error("Purchase is not pending review");
  }

  let totalFils = 0;

  for (const entry of input.items) {
    const pi = existing.items.find((i) => i.id === entry.purchaseItemId);
    if (!pi) throw new Error(`Purchase item ${entry.purchaseItemId} not found`);

    const lineTotalFils = Math.round(pi.purchaseQty * entry.unitCostFils);
    totalFils += lineTotalFils;

    await updatePurchaseItemCost(
      db,
      entry.purchaseItemId,
      entry.unitCostFils,
      lineTotalFils,
    );

    const item = await getInventoryItem(db, pi.inventoryItemId);
    if (!item) continue;

    const newStock = receiveStock(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      pi.baseQty,
      lineTotalFils,
    );
    await adjustStock(db, item.id, newStock.baseQty, newStock.valueFils);
  }

  await approvePurchaseRecord(db, purchaseId, totalFils);
}

export async function rejectPurchase(
  db: SupabaseClient,
  purchaseId: string,
): Promise<void> {
  const existing = await getPurchase(db, purchaseId);
  if (!existing) throw new Error("Purchase not found");
  if (existing.status !== "needs_review") {
    throw new Error("Purchase is not pending review");
  }
  await voidPurchase(db, purchaseId);
}

export async function cancelPurchase(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const purchaseData = await getPurchaseWithItems(db, id);
  if (!purchaseData) throw new Error("Purchase not found");

  for (const pi of purchaseData.items) {
    const item = await getInventoryItem(db, pi.inventoryItemId);
    if (!item) continue;

    const newBaseQty = item.stockBaseQty - pi.baseQty;
    const newValueFils = item.stockValueFils - pi.lineTotalFils;

    await adjustStock(
      db,
      item.id,
      Math.max(0, newBaseQty),
      Math.max(0, newValueFils),
    );
  }

  await voidPurchase(db, id);
}

/**
 * Worker version of recordPurchase. Uses the cost-free operational view
 * for item lookups (workers can't read the base inventory_items table).
 * Always creates with status = 'needs_review'; stock is NOT updated.
 */
export async function recordWorkerPurchase(
  db: SupabaseClient,
  input: WorkerPurchaseCreateInput,
  createdBy: string,
): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
  const allItems = await listInventoryItemsOps(db);
  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  const itemDetails = input.items.map((line) => {
    const item = itemMap.get(line.inventoryItemId);
    if (!item) {
      throw new Error(`Inventory item ${line.inventoryItemId} not found`);
    }
    const baseQty = purchaseToBaseQty(
      line.purchaseQty,
      item.unitsPerPurchase,
      item.basePerStock,
    );
    const lineTotalFils = Math.round(line.purchaseQty * line.unitCostFils);
    return { item, baseQty, lineTotalFils, line };
  });

  const totalFils = itemDetails.reduce((sum, d) => sum + d.lineTotalFils, 0);

  const purchase = await insertPurchase(db, {
    supplierId: input.supplierId ?? null,
    purchasedOn: input.purchasedOn ?? new Date().toISOString().split("T")[0],
    isPaid: input.isPaid,
    dueDate: null,
    totalFils,
    createdBy,
    status: "needs_review",
  });

  const purchaseItemInputs = itemDetails.map((d) => ({
    purchaseId: purchase.id,
    inventoryItemId: d.line.inventoryItemId,
    purchaseQty: d.line.purchaseQty,
    baseQty: d.baseQty,
    unitCostFils: d.line.unitCostFils,
    lineTotalFils: d.lineTotalFils,
  }));

  const items = await insertPurchaseItems(db, purchaseItemInputs);
  return { purchase, items };
}
