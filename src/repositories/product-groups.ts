import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductGroup } from "@/types/inventory";
import type { ProductGroupCreateInput } from "@/lib/validators/inventory";

export async function listProductGroups(
  db: SupabaseClient,
): Promise<ProductGroup[]> {
  const { data, error } = await db
    .from("product_groups")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw error;
  return data.map(toProductGroup);
}

export async function insertProductGroup(
  db: SupabaseClient,
  input: ProductGroupCreateInput,
): Promise<ProductGroup> {
  const { data, error } = await db
    .from("product_groups")
    .insert({
      name: input.name,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toProductGroup(data);
}

export async function updateProductGroup(
  db: SupabaseClient,
  id: string,
  input: Partial<ProductGroupCreateInput>,
): Promise<ProductGroup> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

  const { data, error } = await db
    .from("product_groups")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toProductGroup(data);
}

export async function deleteProductGroup(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("product_groups").delete().eq("id", id);

  if (error) throw error;
}

// snake_case DB row -> camelCase domain type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProductGroup(row: any): ProductGroup {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
