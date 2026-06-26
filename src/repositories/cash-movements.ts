import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashMovement } from "@/types/money";

export interface InsertCashMovementInput {
  direction: "in" | "out";
  reason: string;
  amountFils: number;
  method: string;
  occurredOn: string;
  affectsPl: boolean;
  account?: "register" | "bank";
  sourceType?: string;
  sourceId?: string;
  note?: string;
  createdBy: string;
}

export async function insertCashMovement(
  db: SupabaseClient,
  input: InsertCashMovementInput,
): Promise<CashMovement> {
  const { data, error } = await db
    .from("cash_movements")
    .insert({
      direction: input.direction,
      reason: input.reason,
      amount_fils: input.amountFils,
      method: input.method,
      occurred_on: input.occurredOn,
      affects_pl: input.affectsPl,
      account: input.account ?? "register",
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      note: input.note ?? null,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toCashMovement(data);
}

export async function listCashMovements(
  db: SupabaseClient,
): Promise<CashMovement[]> {
  const { data, error } = await db
    .from("cash_movements")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toCashMovement);
}

export async function deleteCashMovement(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("cash_movements").delete().eq("id", id);
  if (error) throw error;
}

/** Net of the cash log across all accounts: Σ money-in − Σ money-out, in fils. */
export async function getCashPosition(db: SupabaseClient): Promise<number> {
  return sumBalance(db);
}

/** Net cash in the register, in fils. */
export async function getRegisterBalance(db: SupabaseClient): Promise<number> {
  return sumBalance(db, "register");
}

/** Net money in the bank account, in fils. */
export async function getBankBalance(db: SupabaseClient): Promise<number> {
  return sumBalance(db, "bank");
}

/** Sum money-in − money-out, optionally restricted to one account. */
async function sumBalance(
  db: SupabaseClient,
  account?: "register" | "bank",
): Promise<number> {
  let query = db.from("cash_movements").select("direction, amount_fils");
  if (account) query = query.eq("account", account);
  const { data, error } = await query;

  if (error) throw error;
  return data.reduce(
    (sum, r) =>
      sum +
      (r.direction === "in" ? Number(r.amount_fils) : -Number(r.amount_fils)),
    0,
  );
}

/** Find movements posted by a given source (for idempotency / reversal). */
export async function findCashMovementsBySource(
  db: SupabaseClient,
  sourceType: string,
  sourceId: string,
): Promise<CashMovement[]> {
  const { data, error } = await db
    .from("cash_movements")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  if (error) throw error;
  return data.map(toCashMovement);
}

/** Delete all movements posted by a given source (used when reversing). */
export async function deleteCashMovementsBySource(
  db: SupabaseClient,
  sourceType: string,
  sourceId: string,
): Promise<void> {
  const { error } = await db
    .from("cash_movements")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCashMovement(row: any): CashMovement {
  return {
    id: row.id,
    direction: row.direction,
    reason: row.reason,
    amountFils: Number(row.amount_fils),
    method: row.method,
    occurredOn: row.occurred_on,
    affectsPl: row.affects_pl,
    account: row.account ?? "register",
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
