import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Purchase,
  PurchaseItem,
  PurchaseWithSubmitter,
  ReviewStatus,
} from "@/types/inventory";

export interface InsertPurchaseInput {
  supplierId: string | null;
  purchasedOn: string;
  isPaid: boolean;
  dueDate: string | null;
  totalFils: number;
  createdBy: string;
  status?: ReviewStatus;
}

export interface InsertPurchaseItemInput {
  purchaseId: string;
  inventoryItemId: string;
  purchaseQty: number;
  baseQty: number;
  unitCostFils: number;
  lineTotalFils: number;
}

export async function listPurchases(
  db: SupabaseClient,
): Promise<Purchase[]> {
  const { data, error } = await db
    .from("purchases")
    .select("*")
    .neq("status", "voided")
    .order("purchased_on", { ascending: false });

  if (error) throw error;
  return data.map(toPurchase);
}

export async function getPurchase(
  db: SupabaseClient,
  id: string,
): Promise<Purchase | null> {
  const { data, error } = await db
    .from("purchases")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toPurchase(data);
}

export async function getPurchaseItems(
  db: SupabaseClient,
  purchaseId: string,
): Promise<PurchaseItem[]> {
  const { data, error } = await db
    .from("purchase_items")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("created_at");

  if (error) throw error;
  return data.map(toPurchaseItem);
}

export async function insertPurchase(
  db: SupabaseClient,
  input: InsertPurchaseInput,
): Promise<Purchase> {
  const { data, error } = await db
    .from("purchases")
    .insert({
      supplier_id: input.supplierId,
      purchased_on: input.purchasedOn,
      is_paid: input.isPaid,
      due_date: input.dueDate,
      total_fils: input.totalFils,
      created_by: input.createdBy,
      ...(input.status ? { status: input.status } : {}),
    })
    .select("*")
    .single();

  if (error) throw error;
  return toPurchase(data);
}

export async function insertPurchaseItems(
  db: SupabaseClient,
  items: InsertPurchaseItemInput[],
): Promise<PurchaseItem[]> {
  const rows = items.map((item) => ({
    purchase_id: item.purchaseId,
    inventory_item_id: item.inventoryItemId,
    purchase_qty: item.purchaseQty,
    base_qty: item.baseQty,
    unit_cost_fils: item.unitCostFils,
    line_total_fils: item.lineTotalFils,
  }));

  const { data, error } = await db
    .from("purchase_items")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return data.map(toPurchaseItem);
}

export async function voidPurchase(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db
    .from("purchases")
    .update({ status: "voided" })
    .eq("id", id);

  if (error) throw error;
}

export async function approvePurchaseRecord(
  db: SupabaseClient,
  id: string,
  totalFils: number,
): Promise<void> {
  const { error } = await db
    .from("purchases")
    .update({ status: "approved", total_fils: totalFils })
    .eq("id", id);

  if (error) throw error;
}

export async function updatePurchaseItemCost(
  db: SupabaseClient,
  purchaseItemId: string,
  unitCostFils: number,
  lineTotalFils: number,
): Promise<void> {
  const { error } = await db
    .from("purchase_items")
    .update({
      unit_cost_fils: unitCostFils,
      line_total_fils: lineTotalFils,
    })
    .eq("id", purchaseItemId);

  if (error) throw error;
}

export async function listPendingPurchases(
  db: SupabaseClient,
): Promise<PurchaseWithSubmitter[]> {
  const { data, error } = await db
    .from("purchases")
    .select("*")
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const purchases = data.map(toPurchase);
  const creatorIds = [
    ...new Set(purchases.map((p) => p.createdBy).filter(Boolean)),
  ] as string[];

  let nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) {
      nameMap = new Map(profiles.map((p) => [p.id, p.display_name]));
    }
  }

  return purchases.map((p) => ({
    ...p,
    submitterName: (p.createdBy && nameMap.get(p.createdBy)) ?? null,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPurchase(row: any): Purchase {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    purchasedOn: row.purchased_on,
    isPaid: row.is_paid,
    dueDate: row.due_date,
    totalFils: Number(row.total_fils),
    imagePath: row.image_path,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPurchaseItem(row: any): PurchaseItem {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    inventoryItemId: row.inventory_item_id,
    purchaseQty: Number(row.purchase_qty),
    baseQty: Number(row.base_qty),
    unitCostFils: Number(row.unit_cost_fils),
    lineTotalFils: Number(row.line_total_fils),
    createdAt: row.created_at,
  };
}
