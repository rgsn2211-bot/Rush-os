import type { SupabaseClient } from "@supabase/supabase-js";
import type { PosItemCatalog, PosItemCatalogWithProduct } from "@/types/pos";

export async function listPosItemCatalog(
  db: SupabaseClient,
): Promise<PosItemCatalog[]> {
  const { data, error } = await db
    .from("pos_item_catalog")
    .select("*")
    .order("pos_item_id");

  if (error) throw error;
  return data.map(toPosItemCatalog);
}

export async function listPosItemCatalogWithProducts(
  db: SupabaseClient,
): Promise<PosItemCatalogWithProduct[]> {
  const catalog = await listPosItemCatalog(db);

  const productIds = [
    ...new Set(catalog.map((c) => c.productId).filter(Boolean)),
  ] as string[];

  let productMap = new Map<string, string>();
  let recipeProductIds = new Set<string>();

  if (productIds.length > 0) {
    const { data: products } = await db
      .from("products")
      .select("id, name")
      .in("id", productIds);

    if (products) {
      productMap = new Map(products.map((p) => [p.id, p.name]));
    }

    const { data: recipes } = await db
      .from("recipe_ingredients")
      .select("product_id")
      .in("product_id", productIds);

    if (recipes) {
      recipeProductIds = new Set(recipes.map((r) => r.product_id));
    }
  }

  return catalog.map((c) => ({
    ...c,
    productName: c.productId ? (productMap.get(c.productId) ?? null) : null,
    hasRecipe: c.productId ? recipeProductIds.has(c.productId) : false,
  }));
}

export async function getPosItemCatalogByPosId(
  db: SupabaseClient,
  posItemId: number,
): Promise<PosItemCatalog | null> {
  const { data, error } = await db
    .from("pos_item_catalog")
    .select("*")
    .eq("pos_item_id", posItemId)
    .maybeSingle();

  if (error) throw error;
  return data ? toPosItemCatalog(data) : null;
}

export async function upsertPosItemCatalog(
  db: SupabaseClient,
  posItemId: number,
  posItemName: string,
  posCategory: string | null,
): Promise<PosItemCatalog> {
  const { data, error } = await db
    .from("pos_item_catalog")
    .upsert(
      {
        pos_item_id: posItemId,
        pos_item_name: posItemName,
        pos_category: posCategory,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "pos_item_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return toPosItemCatalog(data);
}

export async function updatePosItemMapping(
  db: SupabaseClient,
  posItemId: number,
  productId: string | null,
): Promise<void> {
  const { error } = await db
    .from("pos_item_catalog")
    .update({ product_id: productId })
    .eq("pos_item_id", posItemId);

  if (error) throw error;
}

export async function updatePosItemIgnore(
  db: SupabaseClient,
  posItemId: number,
  ignore: boolean,
): Promise<void> {
  const { error } = await db
    .from("pos_item_catalog")
    .update({ ignore })
    .eq("pos_item_id", posItemId);

  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPosItemCatalog(row: any): PosItemCatalog {
  return {
    id: row.id,
    posItemId: row.pos_item_id,
    posItemName: row.pos_item_name,
    posCategory: row.pos_category,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    productId: row.product_id,
    ignore: row.ignore,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
