import type { SupabaseClient } from "@supabase/supabase-js";
import type { PurchaseOps, PurchaseItemOps } from "@/types/inventory";

/**
 * Cost-free purchase reads for workers. These hit the SECURITY DEFINER
 * `purchases_worker` / `purchase_items_worker` views, so workers see every
 * non-cancelled order (incoming deliveries) and its quantities, but never any
 * money (total, unit costs, paid method/date).
 */

/** All non-cancelled orders, newest first — the worker "incoming" list. */
export async function listPurchasesOps(
  db: SupabaseClient,
): Promise<PurchaseOps[]> {
  const { data, error } = await db
    .from("purchases_worker")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toPurchaseOps);
}

export async function getPurchaseOps(
  db: SupabaseClient,
  id: string,
): Promise<PurchaseOps | null> {
  const { data, error } = await db
    .from("purchases_worker")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toPurchaseOps(data);
}

export async function getPurchaseItemsOps(
  db: SupabaseClient,
  purchaseId: string,
): Promise<PurchaseItemOps[]> {
  const { data, error } = await db
    .from("purchase_items_worker")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("created_at");

  if (error) throw error;
  return data.map(toPurchaseItemOps);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPurchaseOps(row: any): PurchaseOps {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    purchasedOn: row.purchased_on,
    isPaid: row.is_paid,
    dueDate: row.due_date,
    status: row.status,
    receivedOn: row.received_on ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPurchaseItemOps(row: any): PurchaseItemOps {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    inventoryItemId: row.inventory_item_id,
    purchaseQty: Number(row.purchase_qty),
    baseQty: Number(row.base_qty),
    expiryDate: row.expiry_date ?? null,
    createdAt: row.created_at,
  };
}
