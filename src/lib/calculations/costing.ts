/**
 * Inventory costing — weighted-average confirmed cost.
 *
 * Design choice: we never store a rounded "average cost". Instead each item
 * carries two numbers:
 *   - stockBaseQty   : how much is on hand, in the item's base unit
 *   - stockValueFils : the total value of that stock, in integer fils
 *
 * The weighted-average unit cost is simply stockValueFils / stockBaseQty,
 * computed only when displayed. This keeps money math exact (integer fils add
 * up perfectly) and avoids rounding drift across many receipts and sales.
 *
 * All money is integer fils (BHD x 1000). All quantities are in base units.
 */

export interface StockState {
  /** Quantity on hand, in base units. */
  baseQty: number;
  /** Total value of stock on hand, in fils. */
  valueFils: number;
}

/**
 * Convert a quantity expressed in purchase units into base units.
 *
 * Two conversion factors are involved because items are bought, stored, and
 * costed in three different units:
 *   - unitsPerPurchase : stock units per purchase unit (e.g. 25 kg per bag)
 *   - basePerStock     : base units per stock unit     (e.g. 1000 g per kg)
 *
 * Example: 2 bags, 25 kg/bag, 1000 g/kg -> 2 * 25 * 1000 = 50 000 g.
 * basePerStock defaults to 1 for items whose stock and base units are the same.
 * Both factors must be > 0.
 */
export function purchaseToBaseQty(
  purchaseQty: number,
  unitsPerPurchase: number,
  basePerStock = 1,
): number {
  if (unitsPerPurchase <= 0) {
    throw new Error("unitsPerPurchase must be greater than 0");
  }
  if (basePerStock <= 0) {
    throw new Error("basePerStock must be greater than 0");
  }
  return purchaseQty * unitsPerPurchase * basePerStock;
}

/**
 * Receive stock into an item. Adds quantity and its value; the new weighted
 * average falls out automatically. Returns the updated stock state.
 *
 * @param current        current stock state
 * @param receivedBaseQty quantity received, in base units (must be > 0)
 * @param receivedValueFils total value of the received quantity, in fils (>= 0)
 */
export function receiveStock(
  current: StockState,
  receivedBaseQty: number,
  receivedValueFils: number,
): StockState {
  if (receivedBaseQty <= 0) {
    throw new Error("receivedBaseQty must be greater than 0");
  }
  if (receivedValueFils < 0) {
    throw new Error("receivedValueFils cannot be negative");
  }
  return {
    baseQty: current.baseQty + receivedBaseQty,
    valueFils: current.valueFils + receivedValueFils,
  };
}

/**
 * The current weighted-average unit cost in fils, or 0 when there is no stock.
 * This is a derived display value and may be fractional — do not store it.
 */
export function averageUnitCostFils(state: StockState): number {
  if (state.baseQty <= 0) return 0;
  return state.valueFils / state.baseQty;
}

/**
 * Consume stock (a sale via recipe, waste, etc.). Removes quantity at the
 * current weighted-average cost and returns both the new stock state and the
 * value removed (this value is the COGS for the consumption).
 *
 * Removing the last of the stock zeroes the value exactly (no rounding crumbs).
 */
export function consumeStock(
  current: StockState,
  consumedBaseQty: number,
): { state: StockState; cogsFils: number } {
  if (consumedBaseQty <= 0) {
    throw new Error("consumedBaseQty must be greater than 0");
  }
  if (consumedBaseQty > current.baseQty) {
    throw new Error("cannot consume more than the quantity on hand");
  }

  const remainingQty = current.baseQty - consumedBaseQty;

  // If we're emptying the item, remove all remaining value to avoid leftover fils.
  const cogsFils =
    remainingQty === 0
      ? current.valueFils
      : Math.round(averageUnitCostFils(current) * consumedBaseQty);

  return {
    state: {
      baseQty: remainingQty,
      valueFils: current.valueFils - cogsFils,
    },
    cogsFils,
  };
}

export type CostingMethod = "weighted_average" | "fixed";

/**
 * The unit cost to use for an item, respecting its costing method.
 * - fixed: always uses defaultCostFils
 * - weighted_average: uses the live average, falling back to defaultCostFils
 *   when there is no stock on hand
 */
export function effectiveUnitCostFils(
  state: StockState,
  costingMethod: CostingMethod,
  defaultCostFils: number,
): number {
  if (costingMethod === "fixed") return defaultCostFils;
  const avg = averageUnitCostFils(state);
  return avg > 0 ? avg : defaultCostFils;
}

export interface RecipeIngredientCost {
  /** Quantity the recipe uses, in the ingredient's base unit. */
  qtyBase: number;
  /** The ingredient's current weighted-average unit cost, in fils. */
  unitCostFils: number;
}

/**
 * Total recipe cost of a product, in fils — the sum of each ingredient's
 * (quantity x weighted-average unit cost), rounded to whole fils per line.
 */
export function recipeCostFils(ingredients: RecipeIngredientCost[]): number {
  return ingredients.reduce(
    (total, ing) => total + Math.round(ing.qtyBase * ing.unitCostFils),
    0,
  );
}

/**
 * Gross margin of a product in fils (selling price minus recipe cost) and as a
 * percentage of the selling price. Margin% is 0 when the price is 0.
 */
export function grossMargin(
  priceFils: number,
  costFils: number,
): { marginFils: number; marginPct: number } {
  const marginFils = priceFils - costFils;
  const marginPct = priceFils > 0 ? (marginFils / priceFils) * 100 : 0;
  return { marginFils, marginPct };
}
