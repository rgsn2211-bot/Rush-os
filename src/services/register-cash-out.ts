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
import {
  insertCashMovement,
  deleteCashMovementsBySource,
} from "@/repositories/cash-movements";

function cashOutLabel(kind: RegisterCashOut["kind"]): string {
  return kind === "purchase" ? "Register purchase" : "Register withdrawal";
}

/**
 * Worker records cash leaving the register. The register movement is posted
 * immediately — the cash physically left the drawer now — so the balance is
 * truthful straight away. The entry still goes to owner review for oversight.
 */
export async function logCashOut(
  db: SupabaseClient,
  input: RegisterCashOutCreateInput,
  createdBy: string,
): Promise<RegisterCashOut> {
  const cashOut = await insertRegisterCashOut(db, {
    kind: input.kind,
    amountFils: bhdToFils(input.amountBhd),
    reason: input.reason,
    note: input.note,
    createdBy,
  });

  await insertCashMovement(db, {
    direction: "out",
    reason: `${cashOutLabel(cashOut.kind)}: ${cashOut.reason}`,
    amountFils: cashOut.amountFils,
    method: "Cash",
    occurredOn: cashOut.createdAt.split("T")[0],
    affectsPl: false,
    account: "register",
    sourceType: "register_cash_out",
    sourceId: cashOut.id,
    note: cashOut.note ?? undefined,
    createdBy,
  });

  return cashOut;
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
  // Reverse the register movement first (while the cash-out is still pending,
  // which the worker's RLS delete policy requires), then remove the row.
  await deleteCashMovementsBySource(db, "register_cash_out", id);
  await deleteRegisterCashOut(db, id);
}

/**
 * Owner reviews a cash-out. The register movement was already posted when the
 * worker recorded it, so approving is just oversight (confirm). Rejecting
 * reverses the movement so the drawer reflects that the cash didn't leave.
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
    await deleteCashMovementsBySource(db, "register_cash_out", id);
    await updateRegisterCashOutStatus(db, id, "voided", reviewedBy);
    return;
  }

  await updateRegisterCashOutStatus(db, id, "approved", reviewedBy);
}
