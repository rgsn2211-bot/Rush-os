import type { SupabaseClient } from "@supabase/supabase-js";
import type { PosItemCatalogWithProduct } from "@/types/pos";
import {
  listPosItemCatalogWithProducts,
  getPosItemCatalogByPosId,
  updatePosItemMapping,
  updatePosItemIgnore,
} from "@/repositories/pos-catalog";
import { updateProduct, getProduct, listProducts } from "@/repositories/products";
import { updateAllSalesRowsByPosItemId } from "@/repositories/pos-imports";

export async function getPosItemCatalog(
  db: SupabaseClient,
): Promise<PosItemCatalogWithProduct[]> {
  return listPosItemCatalogWithProducts(db);
}

export async function mapPosItem(
  db: SupabaseClient,
  posItemId: number,
  productId: string,
): Promise<void> {
  const product = await getProduct(db, productId);
  if (!product) throw new Error("Product not found");

  if (product.posItemId && product.posItemId !== posItemId) {
    await updatePosItemMapping(db, product.posItemId, null);
  }

  const allProducts = await listProducts(db);
  const previousProduct = allProducts.find(
    (p) => p.posItemId === posItemId && p.id !== productId,
  );
  if (previousProduct) {
    await updateProduct(db, previousProduct.id, { posItemId: undefined });
  }

  await updatePosItemMapping(db, posItemId, productId);
  await updateProduct(db, productId, { posItemId });

  await updateAllSalesRowsByPosItemId(db, posItemId, "mapped", productId);
}

export async function unmapPosItem(
  db: SupabaseClient,
  posItemId: number,
): Promise<void> {
  const catalogEntry = await getPosItemCatalogByPosId(db, posItemId);
  if (!catalogEntry) throw new Error("POS item not found in catalog");

  if (catalogEntry.productId) {
    await updateProduct(db, catalogEntry.productId, {
      posItemId: undefined,
    });
  }

  await updatePosItemMapping(db, posItemId, null);
  await updateAllSalesRowsByPosItemId(db, posItemId, "unmapped", null);
}

export async function ignorePosItem(
  db: SupabaseClient,
  posItemId: number,
  ignore: boolean,
): Promise<void> {
  await updatePosItemIgnore(db, posItemId, ignore);

  if (ignore) {
    await updateAllSalesRowsByPosItemId(db, posItemId, "ignored", null);
  } else {
    const catalogEntry = await getPosItemCatalogByPosId(db, posItemId);
    if (catalogEntry?.productId) {
      await updateAllSalesRowsByPosItemId(
        db,
        posItemId,
        "mapped",
        catalogEntry.productId,
      );
    } else {
      await updateAllSalesRowsByPosItemId(db, posItemId, "unmapped", null);
    }
  }
}
