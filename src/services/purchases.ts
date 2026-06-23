import type { SupabaseClient } from "@supabase/supabase-js";
import type { Purchase, PurchaseItem } from "@/types/inventory";
import type { PurchaseCreateInput } from "@/lib/validators/inventory";
import {
  insertPurchase,
  insertPurchaseItems,
  listPurchases,
  getPurchase,
  getPurchaseItems,
  voidPurchase,
} from "@/repositories/purchases";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
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
 * Record a purchase and update stock for each item.
 *
 * For every line item:
 * 1. Convert purchase qty to base units using the item's unitsPerPurchase
 * 2. Calculate line total (purchaseQty * unitCostFils)
 * 3. Update the item's stock using weighted-average costing
 */
export async function recordPurchase(
  db: SupabaseClient,
  input: PurchaseCreateInput,
  createdBy: string,
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

  return { purchase, items };
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
