import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CostingMethod,
  InventoryItem,
  InventoryItemWithSubmitter,
} from "@/types/inventory";
import type {
  InventoryItemCreateInput,
  WorkerInventoryItemCreateInput,
} from "@/lib/validators/inventory";

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
      stock_unit: input.stockUnit,
      base_per_stock: input.basePerStock,
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
      default_cost_fils: input.defaultCostFils,
      costing_method: input.costingMethod,
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
  if (input.stockUnit !== undefined) updates.stock_unit = input.stockUnit;
  if (input.basePerStock !== undefined) updates.base_per_stock = input.basePerStock;
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
  if (input.defaultCostFils !== undefined) updates.default_cost_fils = input.defaultCostFils;
  if (input.costingMethod !== undefined) updates.costing_method = input.costingMethod;

  const { data, error } = await db
    .from("inventory_items")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toInventoryItem(data);
}

/**
 * Worker insert: sets status 'needs_review' + created_by and DELIBERATELY omits the
 * cost columns (default_cost_fils / costing_method keep their DB defaults). Runs with
 * "return=minimal" (no .select()) because workers have no SELECT policy on this base
 * table — reading it back would fail RLS and could leak cost. Read via the cost-free
 * `inventory_items_worker` view instead.
 */
export async function insertWorkerInventoryItem(
  db: SupabaseClient,
  input: WorkerInventoryItemCreateInput,
  createdBy: string,
): Promise<void> {
  const { error } = await db.from("inventory_items").insert({
    name: input.name,
    category: input.category ?? null,
    base_unit: input.baseUnit,
    stock_unit: input.stockUnit,
    base_per_stock: input.basePerStock,
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
    status: "needs_review",
    created_by: createdBy,
  });

  if (error) throw error;
}

/** Worker update of own pending item — non-cost fields only, no returning (see above). */
export async function updateWorkerInventoryItem(
  db: SupabaseClient,
  id: string,
  input: Partial<WorkerInventoryItemCreateInput>,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.category !== undefined) updates.category = input.category ?? null;
  if (input.baseUnit !== undefined) updates.base_unit = input.baseUnit;
  if (input.stockUnit !== undefined) updates.stock_unit = input.stockUnit;
  if (input.basePerStock !== undefined) updates.base_per_stock = input.basePerStock;
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

  const { error } = await db
    .from("inventory_items")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Worker delete of own pending item (RLS gates ownership + needs_review). */
export async function deleteWorkerInventoryItem(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("inventory_items").delete().eq("id", id);
  if (error) throw error;
}

/** Items awaiting owner review, newest first, with the submitter's name. */
export async function listPendingInventoryItems(
  db: SupabaseClient,
): Promise<InventoryItemWithSubmitter[]> {
  const { data, error } = await db
    .from("inventory_items")
    .select("*")
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const items = data.map(toInventoryItem);

  const creatorIds = [
    ...new Set(items.map((i) => i.createdBy).filter(Boolean)),
  ] as string[];
  const nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) for (const p of profiles) nameMap.set(p.id, p.display_name);
  }

  return items.map((i) => ({
    ...i,
    submitterName: (i.createdBy && nameMap.get(i.createdBy)) ?? null,
  }));
}

/**
 * Owner review action. On approve the owner supplies the real cost (worker items
 * start at cost 0); on reject we just void it. Always stamps who/when.
 */
export async function updateInventoryItemReview(
  db: SupabaseClient,
  id: string,
  status: "approved" | "voided",
  reviewedBy: string,
  cost?: { defaultCostFils: number; costingMethod: CostingMethod },
): Promise<InventoryItem> {
  const updates: Record<string, unknown> = {
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  };
  if (cost) {
    updates.default_cost_fils = cost.defaultCostFils;
    updates.costing_method = cost.costingMethod;
  }

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
    stockValueFils: Number(row.stock_value_fils),
    defaultCostFils: Number(row.default_cost_fils),
    costingMethod: row.costing_method,
    status: row.status,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
