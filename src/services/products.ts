import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, RecipeIngredient, InventoryItem } from "@/types/inventory";
import type { ProductCreateInput } from "@/lib/validators/inventory";
import {
  listProducts,
  getProduct,
  insertProduct,
  updateProduct,
  deleteProduct,
  getRecipeIngredients,
  setRecipeIngredients,
} from "@/repositories/products";
import { listInventoryItems } from "@/repositories/inventory-items";
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
