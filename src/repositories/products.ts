import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Product,
  RecipeIngredient,
  ReviewStatus,
} from "@/types/inventory";
import type { ProductCreateInput } from "@/lib/validators/inventory";

export async function listProducts(
  db: SupabaseClient,
): Promise<Product[]> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .neq("status", "voided")
    .order("name");

  if (error) throw error;
  return data.map(toProduct);
}

export async function getProduct(
  db: SupabaseClient,
  id: string,
): Promise<Product | null> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toProduct(data);
}

export async function insertProduct(
  db: SupabaseClient,
  input: ProductCreateInput,
  opts?: { status?: ReviewStatus; createdBy?: string },
): Promise<Product> {
  const { data, error } = await db
    .from("products")
    .insert({
      name: input.name,
      category: input.category ?? null,
      price_fils: input.priceFils,
      pos_item_id: input.posItemId ?? null,
      group_id: input.groupId ?? null,
      // Owner path omits these → DB defaults (status 'approved', created_by null).
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.createdBy ? { created_by: opts.createdBy } : {}),
    })
    .select("*")
    .single();

  if (error) throw error;
  return toProduct(data);
}

export async function updateProduct(
  db: SupabaseClient,
  id: string,
  input: Partial<ProductCreateInput>,
): Promise<Product> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.category !== undefined) updates.category = input.category ?? null;
  if (input.priceFils !== undefined) updates.price_fils = input.priceFils;
  if (input.posItemId !== undefined) updates.pos_item_id = input.posItemId ?? null;
  if (input.groupId !== undefined) updates.group_id = input.groupId ?? null;

  const { data, error } = await db
    .from("products")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toProduct(data);
}

export async function deleteProduct(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getRecipeIngredients(
  db: SupabaseClient,
  productId: string,
): Promise<RecipeIngredient[]> {
  const { data, error } = await db
    .from("recipe_ingredients")
    .select("*")
    .eq("product_id", productId)
    .order("created_at");

  if (error) throw error;
  return data.map(toRecipeIngredient);
}

/**
 * The non-voided products whose recipe uses an inventory item. Used to warn the
 * owner before deleting an item that products still depend on.
 */
export async function listProductsUsingItem(
  db: SupabaseClient,
  inventoryItemId: string,
): Promise<Product[]> {
  const { data: rows, error } = await db
    .from("recipe_ingredients")
    .select("product_id")
    .eq("inventory_item_id", inventoryItemId);

  if (error) throw error;

  const productIds = [...new Set(rows.map((r) => r.product_id))];
  if (productIds.length === 0) return [];

  const { data, error: productError } = await db
    .from("products")
    .select("*")
    .in("id", productIds)
    .neq("status", "voided");

  if (productError) throw productError;
  return data.map(toProduct);
}

export async function setRecipeIngredients(
  db: SupabaseClient,
  productId: string,
  ingredients: { inventoryItemId: string; qtyBase: number }[],
): Promise<RecipeIngredient[]> {
  const { error: deleteError } = await db
    .from("recipe_ingredients")
    .delete()
    .eq("product_id", productId);

  if (deleteError) throw deleteError;

  if (ingredients.length === 0) return [];

  const rows = ingredients.map((ing) => ({
    product_id: productId,
    inventory_item_id: ing.inventoryItemId,
    qty_base: ing.qtyBase,
  }));

  const { data, error } = await db
    .from("recipe_ingredients")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return data.map(toRecipeIngredient);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    priceFils: Number(row.price_fils),
    posItemId: row.pos_item_id,
    groupId: row.group_id ?? null,
    status: row.status,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecipeIngredient(row: any): RecipeIngredient {
  return {
    id: row.id,
    productId: row.product_id,
    inventoryItemId: row.inventory_item_id,
    qtyBase: Number(row.qty_base),
    createdAt: row.created_at,
  };
}
