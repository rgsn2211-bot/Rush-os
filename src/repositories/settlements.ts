import type { SupabaseClient } from "@supabase/supabase-js";
import type { Settlement } from "@/types/money";

export interface InsertSettlementInput {
  channel: "card" | "benefitpay" | "delivery";
  platform?: string;
  periodLabel: string;
  expectedFils: number;
  feeFils?: number;
  note?: string;
  createdBy: string;
}

export async function insertSettlement(
  db: SupabaseClient,
  input: InsertSettlementInput,
): Promise<Settlement> {
  const { data, error } = await db
    .from("settlements")
    .insert({
      channel: input.channel,
      platform: input.platform ?? null,
      period_label: input.periodLabel,
      expected_fils: input.expectedFils,
      fee_fils: input.feeFils ?? null,
      note: input.note ?? null,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toSettlement(data);
}

export async function listSettlements(
  db: SupabaseClient,
): Promise<Settlement[]> {
  const { data, error } = await db
    .from("settlements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toSettlement);
}

export async function getSettlement(
  db: SupabaseClient,
  id: string,
): Promise<Settlement | null> {
  const { data, error } = await db
    .from("settlements")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toSettlement(data);
}

export async function confirmSettlementReceived(
  db: SupabaseClient,
  id: string,
  actualFils: number,
  feeFils: number | null,
  receivedOn: string,
): Promise<void> {
  const { error } = await db
    .from("settlements")
    .update({
      status: "received",
      actual_fils: actualFils,
      fee_fils: feeFils,
      received_on: receivedOn,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteSettlement(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("settlements").delete().eq("id", id);
  if (error) throw error;
}

/** Total expected from settlements still pending, in fils. */
export async function sumPendingSettlements(
  db: SupabaseClient,
): Promise<number> {
  const { data, error } = await db
    .from("settlements")
    .select("expected_fils")
    .eq("status", "pending");

  if (error) throw error;
  return data.reduce((sum, r) => sum + Number(r.expected_fils), 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSettlement(row: any): Settlement {
  return {
    id: row.id,
    channel: row.channel,
    platform: row.platform,
    periodLabel: row.period_label,
    expectedFils: Number(row.expected_fils),
    feeFils: row.fee_fils === null ? null : Number(row.fee_fils),
    actualFils: row.actual_fils === null ? null : Number(row.actual_fils),
    receivedOn: row.received_on,
    status: row.status,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
