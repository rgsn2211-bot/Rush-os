import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryItemOps } from "@/types/inventory";

export async function listInventoryItemsOps(
  db: SupabaseClient,
): Promise<InventoryItemOps[]> {
  const { data, error } = await db
    .from("inventory_items_worker")
    .select("*")
    .order("name");

  if (error) throw error;
  return data.map(toInventoryItemOps);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toInventoryItemOps(row: any): InventoryItemOps {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    baseUnit: row.base_unit,
    stockUnit: row.stock_unit,
    basePerStock: Number(row.base_per_stock),
    purchaseUnit: row.purchase_unit,
    unitsPerPurchase: Number(row.units_per_purchase),
    expiry: row.expiry,
    tracksOpen: row.tracks_open,
    shelfLifeDays: row.shelf_life_days,
    openLifeDays: row.open_life_days,
    minBaseQty: Number(row.min_base_qty),
    maxBaseQty: row.max_base_qty != null ? Number(row.max_base_qty) : null,
    safetyDays: row.safety_days,
    supplierId: row.supplier_id,
    stockBaseQty: Number(row.stock_base_qty),
    status: row.status,
    createdAt: row.created_at,
  };
}
