import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashMovement } from "@/types/money";

export interface InsertCashMovementInput {
  direction: "in" | "out";
  reason: string;
  amountFils: number;
  method: string;
  occurredOn: string;
  affectsPl: boolean;
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

/** Net of the cash log: Σ money-in − Σ money-out, in fils. */
export async function getCashPosition(db: SupabaseClient): Promise<number> {
  const { data, error } = await db
    .from("cash_movements")
    .select("direction, amount_fils");

  if (error) throw error;
  return data.reduce(
    (sum, r) =>
      sum + (r.direction === "in" ? Number(r.amount_fils) : -Number(r.amount_fils)),
    0,
  );
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
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
