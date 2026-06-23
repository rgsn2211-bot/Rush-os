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
  getComplimentaryLog,
  updateComplimentaryStatus,
} from "@/repositories/complimentary";

export async function logComplimentary(
  db: SupabaseClient,
  input: ComplimentaryLogCreateInput,
  createdBy: string,
): Promise<ComplimentaryLog> {
  return insertComplimentaryLog(db, {
    description: input.description,
    amountFils: bhdToFils(input.amountBhd),
    reason: input.reason,
    notes: input.notes,
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
