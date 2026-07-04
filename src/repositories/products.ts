import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Product,
  ProductWithSubmitter,
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

/** A worker's own products (any status except voided), newest first. */
export async function listMyProducts(
  db: SupabaseClient,
  createdBy: string,
): Promise<Product[]> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("created_by", createdBy)
    .neq("status", "voided")
    .order("created_at", { ascending: false });

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

/** Products awaiting owner review, newest first, with the submitter's name. */
export async function listPendingProducts(
  db: SupabaseClient,
): Promise<ProductWithSubmitter[]> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const products = data.map(toProduct);

  // Resolve submitter names via a batched profiles lookup (mirrors waste repo).
  const creatorIds = [
    ...new Set(products.map((p) => p.createdBy).filter(Boolean)),
  ] as string[];
  const nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) for (const p of profiles) nameMap.set(p.id, p.display_name);
  }

  return products.map((p) => ({
    ...p,
    submitterName: (p.createdBy && nameMap.get(p.createdBy)) ?? null,
  }));
}

/** Owner review action: flip status and stamp who/when. */
export async function updateProductReview(
  db: SupabaseClient,
  id: string,
  status: ReviewStatus,
  reviewedBy: string,
): Promise<Product> {
  const { data, error } = await db
    .from("products")
    .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toProduct(data);
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
