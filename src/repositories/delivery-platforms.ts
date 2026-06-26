import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeliveryPlatform,
  DeliveryPlatformLite,
} from "@/types/delivery";

export interface InsertPlatformInput {
  name: string;
  commissionBps: number;
  fixedFeeFils: number;
  active: boolean;
}

export interface UpdatePlatformInput {
  name?: string;
  commissionBps?: number;
  fixedFeeFils?: number;
  active?: boolean;
  sortOrder?: number;
}

export async function listDeliveryPlatforms(
  db: SupabaseClient,
): Promise<DeliveryPlatform[]> {
  const { data, error } = await db
    .from("delivery_platforms")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw error;
  return data.map(toPlatform);
}

export async function getDeliveryPlatform(
  db: SupabaseClient,
  id: string,
): Promise<DeliveryPlatform | null> {
  const { data, error } = await db
    .from("delivery_platforms")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toPlatform(data);
}

export async function insertDeliveryPlatform(
  db: SupabaseClient,
  input: InsertPlatformInput,
): Promise<DeliveryPlatform> {
  const { data, error } = await db
    .from("delivery_platforms")
    .insert({
      name: input.name,
      commission_bps: input.commissionBps,
      fixed_fee_fils: input.fixedFeeFils,
      active: input.active,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toPlatform(data);
}

export async function updateDeliveryPlatform(
  db: SupabaseClient,
  id: string,
  input: UpdatePlatformInput,
): Promise<DeliveryPlatform> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.commissionBps !== undefined)
    updates.commission_bps = input.commissionBps;
  if (input.fixedFeeFils !== undefined)
    updates.fixed_fee_fils = input.fixedFeeFils;
  if (input.active !== undefined) updates.active = input.active;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

  const { data, error } = await db
    .from("delivery_platforms")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toPlatform(data);
}

/** Cost-free list for workers (names only) via the worker view. */
export async function listDeliveryPlatformsForWorker(
  db: SupabaseClient,
): Promise<DeliveryPlatformLite[]> {
  const { data, error } = await db
    .from("delivery_platforms_worker")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    active: row.active,
    sortOrder: row.sort_order,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPlatform(row: any): DeliveryPlatform {
  return {
    id: row.id,
    name: row.name,
    commissionBps: row.commission_bps,
    fixedFeeFils: Number(row.fixed_fee_fils),
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
