import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryItem } from "@/types/inventory";
import type { InventoryItemCreateInput } from "@/lib/validators/inventory";

export async function listInventoryItems(
  db: SupabaseClient,
): Promise<InventoryItem[]> {
  const { data, error } = await db
    .from("inventory_items")
    .select("*")
    .neq("status", "voided")
    .order("name");

  if (error) throw error;
  return data.map(toInventoryItem);
}

export async function getInventoryItem(
  db: SupabaseClient,
  id: string,
): Promise<InventoryItem | null> {
  const { data, error } = await db
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toInventoryItem(data);
}

export async function insertInventoryItem(
  db: SupabaseClient,
  input: InventoryItemCreateInput,
  createdBy: string,
): Promise<InventoryItem> {
  const { data, error } = await db
    .from("inventory_items")
    .insert({
      name: input.name,
      category: input.category ?? null,
      base_unit: input.baseUnit,
      purchase_unit: input.purchaseUnit,
      units_per_purchase: input.unitsPerPurchase,
      expiry: input.expiry,
      tracks_open: input.tracksOpen,
      shelf_life_days: input.shelfLifeDays ?? null,
      open_life_days: input.openLifeDays ?? null,
      min_base_qty: input.minBaseQty,
      max_base_qty: input.maxBaseQty ?? null,
      safety_days: input.safetyDays,
      supplier_id: input.supplierId ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toInventoryItem(data);
}

export async function updateInventoryItem(
  db: SupabaseClient,
  id: string,
  input: Partial<InventoryItemCreateInput>,
): Promise<InventoryItem> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.category !== undefined) updates.category = input.category ?? null;
  if (input.baseUnit !== undefined) updates.base_unit = input.baseUnit;
  if (input.purchaseUnit !== undefined) updates.purchase_unit = input.purchaseUnit;
  if (input.unitsPerPurchase !== undefined) updates.units_per_purchase = input.unitsPerPurchase;
  if (input.expiry !== undefined) updates.expiry = input.expiry;
  if (input.tracksOpen !== undefined) updates.tracks_open = input.tracksOpen;
  if (input.shelfLifeDays !== undefined) updates.shelf_life_days = input.shelfLifeDays ?? null;
  if (input.openLifeDays !== undefined) updates.open_life_days = input.openLifeDays ?? null;
  if (input.minBaseQty !== undefined) updates.min_base_qty = input.minBaseQty;
  if (input.maxBaseQty !== undefined) updates.max_base_qty = input.maxBaseQty ?? null;
  if (input.safetyDays !== undefined) updates.safety_days = input.safetyDays;
  if (input.supplierId !== undefined) updates.supplier_id = input.supplierId ?? null;

  const { data, error } = await db
    .from("inventory_items")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toInventoryItem(data);
}

export async function adjustStock(
  db: SupabaseClient,
  id: string,
  newBaseQty: number,
  newValueFils: number,
): Promise<void> {
  const { error } = await db
    .from("inventory_items")
    .update({
      stock_base_qty: newBaseQty,
      stock_value_fils: newValueFils,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function voidInventoryItem(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db
    .from("inventory_items")
    .update({ status: "voided" })
    .eq("id", id);

  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toInventoryItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    baseUnit: row.base_unit,
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
    stockValueFils: Number(row.stock_value_fils),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
