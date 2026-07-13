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
