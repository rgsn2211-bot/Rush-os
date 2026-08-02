import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryUsage,
  InventoryUsageSource,
  UsageClass,
} from "@/types/inventory";

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
  usageClass: UsageClass;
  reclassifiedFromId?: string | null;
  reclassNote?: string | null;
  reclassifiedBy?: string | null;
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
      usage_class: u.usageClass,
      reclassified_from_id: u.reclassifiedFromId ?? null,
      reclass_note: u.reclassNote ?? null,
      reclassified_by: u.reclassifiedBy ?? null,
      reclassified_at: u.reclassifiedBy ? new Date().toISOString() : null,
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

export async function getUsageRow(
  db: SupabaseClient,
  id: string,
): Promise<InventoryUsage | null> {
  const { data, error } = await db
    .from("inventory_usage")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toInventoryUsage(data);
}

/** Every ledger row for one item in a period — the owner's loss drill-down. */
export async function listUsageForItemBetween(
  db: SupabaseClient,
  inventoryItemId: string,
  fromInclusive: string,
  toExclusive: string,
): Promise<InventoryUsage[]> {
  const { data, error } = await db
    .from("inventory_usage")
    .select("*")
    .eq("inventory_item_id", inventoryItemId)
    .gte("occurred_on", fromInclusive)
    .lt("occurred_on", toExclusive);

  if (error) throw error;
  return data.map(toInventoryUsage);
}

export interface UpdateUsageRowInput {
  qtyBase?: number;
  cogsFils?: number;
  usageClass?: UsageClass;
  reclassNote?: string | null;
  reclassifiedBy?: string | null;
  reclassifiedAt?: string | null;
  reclassifiedFromId?: string | null;
}

export async function updateUsageRow(
  db: SupabaseClient,
  id: string,
  input: UpdateUsageRowInput,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.qtyBase !== undefined) updates.qty_base = input.qtyBase;
  if (input.cogsFils !== undefined) updates.cogs_fils = input.cogsFils;
  if (input.usageClass !== undefined) updates.usage_class = input.usageClass;
  if (input.reclassNote !== undefined) updates.reclass_note = input.reclassNote;
  if (input.reclassifiedBy !== undefined) {
    updates.reclassified_by = input.reclassifiedBy;
  }
  if (input.reclassifiedAt !== undefined) {
    updates.reclassified_at = input.reclassifiedAt;
  }
  if (input.reclassifiedFromId !== undefined) {
    updates.reclassified_from_id = input.reclassifiedFromId;
  }
  if (Object.keys(updates).length === 0) return;

  const { error } = await db
    .from("inventory_usage")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/** Insert one row and return it (a partial reclassification needs its id). */
export async function insertUsageRow(
  db: SupabaseClient,
  input: InsertInventoryUsageInput,
): Promise<InventoryUsage> {
  const { data, error } = await db
    .from("inventory_usage")
    .insert({
      occurred_on: input.occurredOn,
      source_type: input.sourceType,
      source_id: input.sourceId,
      inventory_item_id: input.inventoryItemId,
      product_id: input.productId ?? null,
      product_group_id: input.productGroupId ?? null,
      product_group_name: input.productGroupName ?? null,
      qty_base: input.qtyBase,
      cogs_fils: input.cogsFils,
      usage_class: input.usageClass,
      reclassified_from_id: input.reclassifiedFromId ?? null,
      reclass_note: input.reclassNote ?? null,
      reclassified_by: input.reclassifiedBy ?? null,
      reclassified_at: input.reclassifiedBy ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toInventoryUsage(data);
}

export async function deleteUsageRow(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("inventory_usage").delete().eq("id", id);
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
    usageClass: (row.usage_class ?? "sold") as UsageClass,
    reclassifiedFromId: row.reclassified_from_id ?? null,
    reclassNote: row.reclass_note ?? null,
    reclassifiedBy: row.reclassified_by ?? null,
    reclassifiedAt: row.reclassified_at ?? null,
    createdAt: row.created_at,
  };
}
