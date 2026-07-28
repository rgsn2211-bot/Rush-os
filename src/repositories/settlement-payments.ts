import type { SupabaseClient } from "@supabase/supabase-js";
import type { SettlementPayment } from "@/types/money";

export interface InsertSettlementPaymentInput {
  channel: "card" | "delivery" | "benefitpay";
  platform?: string | null;
  kind: "payout" | "commission";
  amountFils: number;
  receivedOn?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  feeType?: string | null;
  note?: string | null;
  createdBy: string;
}

export async function insertSettlementPayment(
  db: SupabaseClient,
  input: InsertSettlementPaymentInput,
): Promise<SettlementPayment> {
  const { data, error } = await db
    .from("settlement_payments")
    .insert({
      channel: input.channel,
      platform: input.platform ?? null,
      kind: input.kind,
      amount_fils: input.amountFils,
      received_on: input.receivedOn ?? null,
      period_from: input.periodFrom ?? null,
      period_to: input.periodTo ?? null,
      fee_type: input.feeType ?? null,
      note: input.note ?? null,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toSettlementPayment(data);
}

export async function listSettlementPayments(
  db: SupabaseClient,
): Promise<SettlementPayment[]> {
  const { data, error } = await db
    .from("settlement_payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toSettlementPayment);
}

export async function getSettlementPayment(
  db: SupabaseClient,
  id: string,
): Promise<SettlementPayment | null> {
  const { data, error } = await db
    .from("settlement_payments")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toSettlementPayment(data);
}

export async function deleteSettlementPayment(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db
    .from("settlement_payments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSettlementPayment(row: any): SettlementPayment {
  return {
    id: row.id,
    channel: row.channel,
    platform: row.platform ?? null,
    kind: row.kind,
    amountFils: Number(row.amount_fils),
    receivedOn: row.received_on ?? null,
    periodFrom: row.period_from ?? null,
    periodTo: row.period_to ?? null,
    feeType: row.fee_type ?? null,
    note: row.note ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
