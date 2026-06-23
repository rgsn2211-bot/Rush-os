import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComplimentaryLog,
  ComplimentaryLogWithSubmitter,
} from "@/types/pos";
import type { ComplimentaryLogCreateInput } from "@/lib/validators/pos";
import { bhdToFils } from "@/lib/calculations/currency";
import {
  insertComplimentaryLog,
  listComplimentaryLogs,
  listPendingComplimentaryLogs,
  listWorkerTodayLogs,
  getComplimentaryLog,
  updateComplimentaryStatus,
  deleteComplimentaryLog,
} from "@/repositories/complimentary";
import { getProduct } from "@/repositories/products";

export async function logComplimentary(
  db: SupabaseClient,
  input: ComplimentaryLogCreateInput,
  createdBy: string,
): Promise<ComplimentaryLog> {
  let description = input.description ?? "";
  const productId = input.productId;

  if (productId) {
    const product = await getProduct(db, productId);
    if (!product) throw new Error("Product not found");
    if (!description) {
      description = product.name;
    }
  }

  if (!description) throw new Error("Description is required");

  return insertComplimentaryLog(db, {
    description,
    amountFils: bhdToFils(input.amountBhd),
    reason: input.reason,
    notes: input.notes,
    productId,
    createdBy,
  });
}

export async function getAllComplimentaryLogs(
  db: SupabaseClient,
): Promise<ComplimentaryLogWithSubmitter[]> {
  return listComplimentaryLogs(db);
}

export async function getPendingComplimentary(
  db: SupabaseClient,
): Promise<ComplimentaryLogWithSubmitter[]> {
  return listPendingComplimentaryLogs(db);
}

export async function getWorkerTodayLogs(
  db: SupabaseClient,
  userId: string,
): Promise<ComplimentaryLog[]> {
  return listWorkerTodayLogs(db, userId);
}

export async function deleteOwnComplimentary(
  db: SupabaseClient,
  logId: string,
  userId: string,
): Promise<void> {
  const log = await getComplimentaryLog(db, logId);
  if (!log) throw new Error("Complimentary log not found");
  if (log.createdBy !== userId) {
    throw new Error("You can only delete your own logs");
  }
  if (log.status !== "needs_review") {
    throw new Error("Can only delete pending logs");
  }
  await deleteComplimentaryLog(db, logId);
}

export async function reviewComplimentary(
  db: SupabaseClient,
  id: string,
  action: "approve" | "reject",
  reviewedBy: string,
): Promise<void> {
  const log = await getComplimentaryLog(db, id);
  if (!log) throw new Error("Complimentary log not found");
  if (log.status !== "needs_review") {
    throw new Error("Log is not pending review");
  }

  const newStatus = action === "approve" ? "approved" : "voided";
  await updateComplimentaryStatus(db, id, newStatus, reviewedBy);
}
