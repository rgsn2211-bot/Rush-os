import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RegisterCashOut,
  RegisterCashOutWithSubmitter,
  CashOutKind,
} from "@/types/register-cash-out";

export interface InsertCashOutInput {
  kind: CashOutKind;
  amountFils: number;
  reason: string;
  note?: string;
  createdBy: string;
}

export async function insertRegisterCashOut(
  db: SupabaseClient,
  input: InsertCashOutInput,
): Promise<RegisterCashOut> {
  const { data, error } = await db
    .from("register_cash_outs")
    .insert({
      kind: input.kind,
      amount_fils: input.amountFils,
      reason: input.reason,
      note: input.note ?? null,
      created_by: input.createdBy,
      status: "needs_review",
    })
    .select("*")
    .single();

  if (error) throw error;
  return toCashOut(data);
}

export async function listRegisterCashOuts(
  db: SupabaseClient,
): Promise<RegisterCashOutWithSubmitter[]> {
  const { data, error } = await db
    .from("register_cash_outs")
    .select("*")
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return withSubmitterNames(db, data.map(toCashOut));
}

export async function listPendingRegisterCashOuts(
  db: SupabaseClient,
): Promise<RegisterCashOutWithSubmitter[]> {
  const { data, error } = await db
    .from("register_cash_outs")
    .select("*")
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return withSubmitterNames(db, data.map(toCashOut));
}

export async function listWorkerTodayCashOuts(
  db: SupabaseClient,
  userId: string,
): Promise<RegisterCashOut[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await db
    .from("register_cash_outs")
    .select("*")
    .eq("created_by", userId)
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59.999`)
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toCashOut);
}

export async function getRegisterCashOut(
  db: SupabaseClient,
  id: string,
): Promise<RegisterCashOut | null> {
  const { data, error } = await db
    .from("register_cash_outs")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toCashOut(data);
}

export async function updateRegisterCashOutStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  reviewedBy: string,
): Promise<void> {
  const { error } = await db
    .from("register_cash_outs")
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteRegisterCashOut(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("register_cash_outs").delete().eq("id", id);
  if (error) throw error;
}

async function withSubmitterNames(
  db: SupabaseClient,
  rows: RegisterCashOut[],
): Promise<RegisterCashOutWithSubmitter[]> {
  const creatorIds = [
    ...new Set(rows.map((r) => r.createdBy).filter(Boolean)),
  ] as string[];

  const nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) {
      for (const p of profiles) nameMap.set(p.id, p.display_name);
    }
  }

  return rows.map((r) => ({
    ...r,
    submitterName: (r.createdBy && nameMap.get(r.createdBy)) ?? null,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCashOut(row: any): RegisterCashOut {
  return {
    id: row.id,
    kind: row.kind,
    amountFils: Number(row.amount_fils),
    reason: row.reason,
    note: row.note,
    status: row.status,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
