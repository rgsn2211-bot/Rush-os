import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryItem } from "@/types/inventory";
import type { InventoryItemCreateInput } from "@/lib/validators/inventory";
import {
  listInventoryItems,
  getInventoryItem,
  insertInventoryItem,
  updateInventoryItem,
  voidInventoryItem,
} from "@/repositories/inventory-items";
import { listProductsUsingItem } from "@/repositories/products";

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

/**
 * What deleting an item would affect, so the owner can confirm knowingly.
 * Deleting is a soft delete: the item disappears from every list, picker and
 * future report, but its history (purchases, waste, counts, POS deductions)
 * stays intact so past reports keep their numbers.
 */
export interface ItemDeletionImpact {
  itemName: string;
  stockBaseQty: number;
  baseUnit: string;
  stockValueFils: number;
  inRecipes: { id: string; name: string }[];
}

export async function getItemDeletionImpact(
  db: SupabaseClient,
  id: string,
): Promise<ItemDeletionImpact | null> {
  const item = await getInventoryItem(db, id);
  if (!item) return null;

  const products = await listProductsUsingItem(db, id);

  return {
    itemName: item.name,
    stockBaseQty: item.stockBaseQty,
    baseUnit: item.baseUnit,
    stockValueFils: item.stockValueFils,
    inRecipes: products.map((p) => ({ id: p.id, name: p.name })),
  };
}

/**
 * Soft delete. Recipes that still reference the item are NOT blocked — the
 * owner may be retiring a product line — but the UI warns first.
 */
export async function removeItem(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return voidInventoryItem(db, id);
}
