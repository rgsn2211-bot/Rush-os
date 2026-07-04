import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Product,
  ProductWithSubmitter,
  RecipeIngredient,
  InventoryItem,
} from "@/types/inventory";
import type {
  ProductCreateInput,
  WorkerProductCreateInput,
} from "@/lib/validators/inventory";
import {
  listProducts,
  getProduct,
  insertProduct,
  updateProduct,
  deleteProduct,
  getRecipeIngredients,
  setRecipeIngredients,
  listPendingProducts,
  updateProductReview,
  listMyProducts,
} from "@/repositories/products";
import { listInventoryItems } from "@/repositories/inventory-items";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import {
  recipeCostFils,
  grossMargin,
  effectiveUnitCostFils,
} from "@/lib/calculations/costing";

export interface ProductWithCost extends Product {
  recipe: RecipeIngredient[];
  costFils: number;
  marginFils: number;
  marginPct: number;
}

export async function getAllProducts(
  db: SupabaseClient,
): Promise<Product[]> {
  return listProducts(db);
}

export async function getAllProductsWithCosts(
  db: SupabaseClient,
): Promise<ProductWithCost[]> {
  const products = await listProducts(db);
  const items = await listInventoryItems(db);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const results: ProductWithCost[] = [];
  for (const product of products) {
    const recipe = await getRecipeIngredients(db, product.id);
    const ingredientCosts = recipe.map((r) => {
      const item = itemMap.get(r.inventoryItemId);
      return {
        qtyBase: r.qtyBase,
        unitCostFils: item
          ? effectiveUnitCostFils(
              { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
              item.costingMethod,
              item.defaultCostFils,
            )
          : 0,
      };
    });
    const costFils = recipeCostFils(ingredientCosts);
    const margin = grossMargin(product.priceFils, costFils);
    results.push({
      ...product,
      recipe,
      costFils,
      marginFils: margin.marginFils,
      marginPct: margin.marginPct,
    });
  }
  return results;
}

export async function getProductWithCost(
  db: SupabaseClient,
  id: string,
): Promise<ProductWithCost | null> {
  const product = await getProduct(db, id);
  if (!product) return null;

  const recipe = await getRecipeIngredients(db, id);
  const items = await listInventoryItems(db);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const ingredientCosts = recipe.map((r) => {
    const item = itemMap.get(r.inventoryItemId);
    return {
      qtyBase: r.qtyBase,
      unitCostFils: item
        ? effectiveUnitCostFils(
            { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
            item.costingMethod,
            item.defaultCostFils,
          )
        : 0,
    };
  });

  const costFils = recipeCostFils(ingredientCosts);
  const margin = grossMargin(product.priceFils, costFils);

  return {
    ...product,
    recipe,
    costFils,
    marginFils: margin.marginFils,
    marginPct: margin.marginPct,
  };
}

export async function createProduct(
  db: SupabaseClient,
  input: ProductCreateInput,
): Promise<Product> {
  const product = await insertProduct(db, input);

  if (input.recipe.length > 0) {
    await setRecipeIngredients(db, product.id, input.recipe);
  }

  return product;
}

export async function editProduct(
  db: SupabaseClient,
  id: string,
  input: Partial<ProductCreateInput>,
): Promise<Product> {
  const product = await updateProduct(db, id, input);

  if (input.recipe !== undefined) {
    await setRecipeIngredients(db, id, input.recipe);
  }

  return product;
}

export async function removeProduct(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteProduct(db, id);
}

// ---------- Worker authoring (immediately usable, owner-reviewed) ------------

/**
 * Worker creates a product with a recipe. Flagged needs_review but immediately
 * usable (POS deduction keys off the recipe, not status). Recipe items are
 * validated against the cost-free worker view; no cost/margin is ever computed.
 */
export async function createWorkerProduct(
  db: SupabaseClient,
  input: WorkerProductCreateInput,
  createdBy: string,
): Promise<Product> {
  await assertRecipeItemsVisible(db, input.recipe);

  const product = await insertProduct(db, input, {
    status: "needs_review",
    createdBy,
  });
  await setRecipeIngredients(db, product.id, input.recipe);
  return product;
}

/** Worker edits their own still-pending product (RLS enforces own + needs_review). */
export async function editWorkerProduct(
  db: SupabaseClient,
  id: string,
  input: WorkerProductCreateInput,
): Promise<Product> {
  await assertRecipeItemsVisible(db, input.recipe);

  const product = await updateProduct(db, id, {
    name: input.name,
    category: input.category,
    groupId: input.groupId,
    priceFils: input.priceFils,
  });
  await setRecipeIngredients(db, id, input.recipe);
  return product;
}

/** Worker deletes their own still-pending product (RLS enforces own + needs_review). */
export async function removeWorkerProduct(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteProduct(db, id);
}

/** A worker's own product submissions, for their index page. */
export async function getMyProducts(
  db: SupabaseClient,
  createdBy: string,
): Promise<Product[]> {
  return listMyProducts(db, createdBy);
}

/** Cost-free load of a product + its recipe, for a worker edit form. */
export async function getWorkerProductForEdit(
  db: SupabaseClient,
  id: string,
): Promise<{ product: Product; recipe: RecipeIngredient[] } | null> {
  const product = await getProduct(db, id);
  if (!product) return null;
  const recipe = await getRecipeIngredients(db, id);
  return { product, recipe };
}

/** Guards that every recipe ingredient references an item the worker can see. */
async function assertRecipeItemsVisible(
  db: SupabaseClient,
  recipe: { inventoryItemId: string }[],
): Promise<void> {
  const visible = new Set((await listInventoryItemsOps(db)).map((i) => i.id));
  for (const line of recipe) {
    if (!visible.has(line.inventoryItemId)) {
      throw new Error("Recipe references an unknown inventory item");
    }
  }
}

// ---------- Owner review ----------------------------------------------------

export async function getPendingProducts(
  db: SupabaseClient,
): Promise<ProductWithSubmitter[]> {
  return listPendingProducts(db);
}

/** Owner approves a worker product (no stock effect — just confirms it). */
export async function approveProduct(
  db: SupabaseClient,
  id: string,
  reviewedBy: string,
): Promise<Product> {
  const product = await getProduct(db, id);
  if (!product) throw new Error("Product not found");
  if (product.status !== "needs_review") {
    throw new Error("This product has already been reviewed");
  }
  return updateProductReview(db, id, "approved", reviewedBy);
}

/** Owner rejects a worker product (voided; skipped by POS deduction). */
export async function rejectProduct(
  db: SupabaseClient,
  id: string,
  reviewedBy: string,
): Promise<Product> {
  const product = await getProduct(db, id);
  if (!product) throw new Error("Product not found");
  if (product.status !== "needs_review") {
    throw new Error("This product has already been reviewed");
  }
  return updateProductReview(db, id, "voided", reviewedBy);
}

export async function getProductRecipe(
  db: SupabaseClient,
  productId: string,
): Promise<RecipeIngredient[]> {
  return getRecipeIngredients(db, productId);
}

export async function buildCostBreakdown(
  db: SupabaseClient,
  productId: string,
): Promise<{
  ingredients: { item: InventoryItem; qtyBase: number; lineCostFils: number }[];
  totalCostFils: number;
}> {
  const recipe = await getRecipeIngredients(db, productId);
  const items = await listInventoryItems(db);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const ingredients = recipe.map((r) => {
    const item = itemMap.get(r.inventoryItemId)!;
    const unitCost = effectiveUnitCostFils(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      item.costingMethod,
      item.defaultCostFils,
    );
    return {
      item,
      qtyBase: r.qtyBase,
      lineCostFils: Math.round(r.qtyBase * unitCost),
    };
  });

  const totalCostFils = ingredients.reduce((sum, i) => sum + i.lineCostFils, 0);

  return { ingredients, totalCostFils };
}
