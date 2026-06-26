import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RegisterCashOut,
  RegisterCashOutWithSubmitter,
} from "@/types/register-cash-out";
import type { RegisterCashOutCreateInput } from "@/lib/validators/register-cash-out";
import { bhdToFils } from "@/lib/calculations/currency";
import {
  insertRegisterCashOut,
  listRegisterCashOuts,
  listPendingRegisterCashOuts,
  listWorkerTodayCashOuts,
  getRegisterCashOut,
  updateRegisterCashOutStatus,
  deleteRegisterCashOut,
} from "@/repositories/register-cash-outs";
import { insertCashMovement } from "@/repositories/cash-movements";

/**
 * Worker records cash leaving the register. Created as needs_review; the
 * register balance is NOT touched until the owner approves.
 */
export async function logCashOut(
  db: SupabaseClient,
  input: RegisterCashOutCreateInput,
  createdBy: string,
): Promise<RegisterCashOut> {
  return insertRegisterCashOut(db, {
    kind: input.kind,
    amountFils: bhdToFils(input.amountBhd),
    reason: input.reason,
    note: input.note,
    createdBy,
  });
}

export async function getAllCashOuts(
  db: SupabaseClient,
): Promise<RegisterCashOutWithSubmitter[]> {
  return listRegisterCashOuts(db);
}

export async function getPendingCashOuts(
  db: SupabaseClient,
): Promise<RegisterCashOutWithSubmitter[]> {
  return listPendingRegisterCashOuts(db);
}

export async function getWorkerTodayCashOuts(
  db: SupabaseClient,
  userId: string,
): Promise<RegisterCashOut[]> {
  return listWorkerTodayCashOuts(db, userId);
}

export async function deleteOwnCashOut(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const cashOut = await getRegisterCashOut(db, id);
  if (!cashOut) throw new Error("Cash-out not found");
  if (cashOut.createdBy !== userId) {
    throw new Error("You can only delete your own submissions");
  }
  if (cashOut.status !== "needs_review") {
    throw new Error("Can only delete a pending submission");
  }
  await deleteRegisterCashOut(db, id);
}

/**
 * Owner reviews a cash-out. Approving posts a register `out` movement (tagged
 * with the cash-out id, so it's traceable) — the register balance drops by the
 * amount. Rejecting voids it with no money effect.
 */
export async function reviewCashOut(
  db: SupabaseClient,
  id: string,
  action: "approve" | "reject",
  reviewedBy: string,
): Promise<void> {
  const cashOut = await getRegisterCashOut(db, id);
  if (!cashOut) throw new Error("Cash-out not found");
  if (cashOut.status !== "needs_review") {
    throw new Error("Cash-out is not pending review");
  }

  if (action === "reject") {
    await updateRegisterCashOutStatus(db, id, "voided", reviewedBy);
    return;
  }

  const label = cashOut.kind === "purchase" ? "Register purchase" : "Register withdrawal";
  await insertCashMovement(db, {
    direction: "out",
    reason: `${label}: ${cashOut.reason}`,
    amountFils: cashOut.amountFils,
    method: "Cash",
    occurredOn: cashOut.createdAt.split("T")[0],
    affectsPl: false,
    account: "register",
    sourceType: "register_cash_out",
    sourceId: id,
    note: cashOut.note ?? undefined,
    createdBy: reviewedBy,
  });

  await updateRegisterCashOutStatus(db, id, "approved", reviewedBy);
}
