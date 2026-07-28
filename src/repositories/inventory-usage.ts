import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryUsage, InventoryUsageSource } from "@/types/inventory";

export interface InsertInventoryUsageInput {
  occurredOn: string;
  sourceType: InventoryUsageSource;
  sourceId: string;
  inventoryItemId: string;
  productId?: string | null;
  productGroupId?: string | null;
  productGroupName?: string | null;
  qtyBase: number;
  cogsFils: number;
}

export async function insertUsageRows(
  db: SupabaseClient,
  inputs: InsertInventoryUsageInput[],
): Promise<void> {
  if (inputs.length === 0) return;

  const { error } = await db.from("inventory_usage").insert(
    inputs.map((u) => ({
      occurred_on: u.occurredOn,
      source_type: u.sourceType,
      source_id: u.sourceId,
      inventory_item_id: u.inventoryItemId,
      product_id: u.productId ?? null,
      product_group_id: u.productGroupId ?? null,
      product_group_name: u.productGroupName ?? null,
      qty_base: u.qtyBase,
      cogs_fils: u.cogsFils,
    })),
  );

  if (error) throw error;
}

/** The ledger rows one source event wrote (exact record of what it consumed). */
export async function listUsageBySource(
  db: SupabaseClient,
  sourceType: InventoryUsageSource,
  sourceId: string,
): Promise<InventoryUsage[]> {
  const { data, error } = await db
    .from("inventory_usage")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  if (error) throw error;
  return data.map(toInventoryUsage);
}

/** Remove the ledger rows a source event wrote (used when voiding it). */
export async function deleteUsageBySource(
  db: SupabaseClient,
  sourceType: InventoryUsageSource,
  sourceId: string,
): Promise<void> {
  const { error } = await db
    .from("inventory_usage")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  if (error) throw error;
}

/**
 * Usage rows in [fromInclusive, toExclusive), optionally limited to some
 * source types. Aggregation happens in the service layer (volumes are small
 * for a single shop).
 */
export async function listUsageBetween(
  db: SupabaseClient,
  fromInclusive: string,
  toExclusive: string,
  sourceTypes?: InventoryUsageSource[],
): Promise<InventoryUsage[]> {
  let query = db
    .from("inventory_usage")
    .select("*")
    .gte("occurred_on", fromInclusive)
    .lt("occurred_on", toExclusive);

  if (sourceTypes && sourceTypes.length > 0) {
    query = query.in("source_type", sourceTypes);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(toInventoryUsage);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toInventoryUsage(row: any): InventoryUsage {
  return {
    id: row.id,
    occurredOn: row.occurred_on,
    sourceType: row.source_type,
    sourceId: row.source_id,
    inventoryItemId: row.inventory_item_id,
    productId: row.product_id ?? null,
    productGroupId: row.product_group_id ?? null,
    productGroupName: row.product_group_name ?? null,
    qtyBase: Number(row.qty_base),
    cogsFils: Number(row.cogs_fils),
    createdAt: row.created_at,
  };
}
