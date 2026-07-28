import type { InventoryItem } from "@/types/inventory";

/**
 * The unit cost (fils per base unit) to use when consuming an item past zero.
 *
 * Chain: live weighted average while stock is positive → the last known
 * average persisted on the item → the owner-entered default cost. Never
 * negative; may be fractional fils (totals are rounded once per line).
 */
export function fallbackUnitCostFils(item: InventoryItem): number {
  if (item.stockBaseQty > 0 && item.stockValueFils > 0) {
    return item.stockValueFils / item.stockBaseQty;
  }
  if (item.lastUnitCostFils > 0) return item.lastUnitCostFils;
  return item.defaultCostFils;
}
