import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeliveryPlatform,
  DeliveryPlatformLite,
} from "@/types/delivery";
import type {
  DeliveryPlatformCreateInput,
  DeliveryPlatformUpdateInput,
} from "@/lib/validators/delivery";
import { bhdToFils } from "@/lib/calculations/currency";
import {
  listDeliveryPlatforms,
  getDeliveryPlatform,
  insertDeliveryPlatform,
  updateDeliveryPlatform,
  listDeliveryPlatformsForWorker,
} from "@/repositories/delivery-platforms";

export async function getPlatforms(
  db: SupabaseClient,
): Promise<DeliveryPlatform[]> {
  return listDeliveryPlatforms(db);
}

export async function getActivePlatforms(
  db: SupabaseClient,
): Promise<DeliveryPlatform[]> {
  const all = await listDeliveryPlatforms(db);
  return all.filter((p) => p.active);
}

/** Cost-free platform list for the worker EOD wizard (no commission shown). */
export async function getPlatformsForWorker(
  db: SupabaseClient,
): Promise<DeliveryPlatformLite[]> {
  return listDeliveryPlatformsForWorker(db);
}

export async function createPlatform(
  db: SupabaseClient,
  input: DeliveryPlatformCreateInput,
): Promise<DeliveryPlatform> {
  return insertDeliveryPlatform(db, {
    name: input.name,
    commissionBps: Math.round(input.commissionPct * 100),
    fixedFeeFils: bhdToFils(input.fixedFeeBhd),
    active: input.active,
  });
}

export async function editPlatform(
  db: SupabaseClient,
  id: string,
  input: DeliveryPlatformUpdateInput,
): Promise<DeliveryPlatform> {
  const existing = await getDeliveryPlatform(db, id);
  if (!existing) throw new Error("Platform not found");

  return updateDeliveryPlatform(db, id, {
    name: input.name,
    commissionBps:
      input.commissionPct === undefined
        ? undefined
        : Math.round(input.commissionPct * 100),
    fixedFeeFils:
      input.fixedFeeBhd === undefined
        ? undefined
        : bhdToFils(input.fixedFeeBhd),
    active: input.active,
    sortOrder: input.sortOrder,
  });
}

/**
 * Platform's cut on a day's sales: commission (% of gross) + a fixed fee per
 * order. All integer fils. Used to compute the expected (net) settlement.
 */
export function platformFeeFils(
  salesFils: number,
  orders: number,
  commissionBps: number,
  fixedFeeFils: number,
): number {
  return Math.round((salesFils * commissionBps) / 10000) + orders * fixedFeeFils;
}
