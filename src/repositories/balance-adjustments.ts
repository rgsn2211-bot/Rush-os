import type { SupabaseClient } from "@supabase/supabase-js";
import type { BalanceAdjustment, CashAccount } from "@/types/money";

export interface InsertBalanceAdjustmentInput {
  account: CashAccount;
  expectedFils: number;
  actualFils: number;
  diffFils: number;
  note?: string;
  occurredOn: string;
  createdBy: string;
}

export async function insertBalanceAdjustment(
  db: SupabaseClient,
  input: InsertBalanceAdjustmentInput,
): Promise<BalanceAdjustment> {
  const { data, error } = await db
    .from("balance_adjustments")
    .insert({
      account: input.account,
      expected_fils: input.expectedFils,
      actual_fils: input.actualFils,
      diff_fils: input.diffFils,
      note: input.note ?? null,
      occurred_on: input.occurredOn,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toBalanceAdjustment(data);
}

export async function listBalanceAdjustments(
  db: SupabaseClient,
): Promise<BalanceAdjustment[]> {
  const { data, error } = await db
    .from("balance_adjustments")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toBalanceAdjustment);
}

export async function getBalanceAdjustment(
  db: SupabaseClient,
  id: string,
): Promise<BalanceAdjustment | null> {
  const { data, error } = await db
    .from("balance_adjustments")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toBalanceAdjustment(data);
}

export async function deleteBalanceAdjustment(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("balance_adjustments").delete().eq("id", id);
  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBalanceAdjustment(row: any): BalanceAdjustment {
  return {
    id: row.id,
    account: row.account,
    expectedFils: Number(row.expected_fils),
    actualFils: Number(row.actual_fils),
    diffFils: Number(row.diff_fils),
    note: row.note,
    occurredOn: row.occurred_on,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
