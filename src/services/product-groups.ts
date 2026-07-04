import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductGroup } from "@/types/inventory";
import type { ProductGroupCreateInput } from "@/lib/validators/inventory";
import {
  listProductGroups,
  insertProductGroup,
  updateProductGroup,
  deleteProductGroup,
} from "@/repositories/product-groups";

export async function getAllProductGroups(
  db: SupabaseClient,
): Promise<ProductGroup[]> {
  return listProductGroups(db);
}

export async function createProductGroup(
  db: SupabaseClient,
  input: ProductGroupCreateInput,
): Promise<ProductGroup> {
  return insertProductGroup(db, input);
}

export async function editProductGroup(
  db: SupabaseClient,
  id: string,
  input: Partial<ProductGroupCreateInput>,
): Promise<ProductGroup> {
  return updateProductGroup(db, id, input);
}

export async function removeProductGroup(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  // The FK is ON DELETE SET NULL, so a group's products are detached (they fall
  // back to "Ungrouped"), never deleted.
  return deleteProductGroup(db, id);
}
