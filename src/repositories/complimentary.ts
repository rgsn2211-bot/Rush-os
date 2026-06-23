import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComplimentaryLog,
  ComplimentaryLogWithSubmitter,
} from "@/types/pos";

export interface InsertComplimentaryLogInput {
  description: string;
  amountFils: number;
  reason: string;
  notes?: string;
  productId?: string;
  createdBy: string;
}

export async function insertComplimentaryLog(
  db: SupabaseClient,
  input: InsertComplimentaryLogInput,
): Promise<ComplimentaryLog> {
  const { data, error } = await db
    .from("complimentary_logs")
    .insert({
      description: input.description,
      amount_fils: input.amountFils,
      reason: input.reason,
      notes: input.notes ?? null,
      product_id: input.productId ?? null,
      created_by: input.createdBy,
      status: "needs_review",
    })
    .select("*")
    .single();

  if (error) throw error;
  return toComplimentaryLog(data);
}

export async function listComplimentaryLogs(
  db: SupabaseClient,
): Promise<ComplimentaryLogWithSubmitter[]> {
  const { data, error } = await db
    .from("complimentary_logs")
    .select("*")
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const logs = data.map(toComplimentaryLog);
  const creatorIds = [
    ...new Set(logs.map((l) => l.createdBy).filter(Boolean)),
  ] as string[];

  let nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) {
      nameMap = new Map(profiles.map((p) => [p.id, p.display_name]));
    }
  }

  return logs.map((l) => ({
    ...l,
    submitterName: (l.createdBy && nameMap.get(l.createdBy)) ?? null,
  }));
}

export async function listPendingComplimentaryLogs(
  db: SupabaseClient,
): Promise<ComplimentaryLogWithSubmitter[]> {
  const { data, error } = await db
    .from("complimentary_logs")
    .select("*")
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const logs = data.map(toComplimentaryLog);
  const creatorIds = [
    ...new Set(logs.map((l) => l.createdBy).filter(Boolean)),
  ] as string[];

  let nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) {
      nameMap = new Map(profiles.map((p) => [p.id, p.display_name]));
    }
  }

  return logs.map((l) => ({
    ...l,
    submitterName: (l.createdBy && nameMap.get(l.createdBy)) ?? null,
  }));
}

export async function listWorkerTodayLogs(
  db: SupabaseClient,
  userId: string,
): Promise<ComplimentaryLog[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await db
    .from("complimentary_logs")
    .select("*")
    .eq("created_by", userId)
    .gte("occurred_at", `${today}T00:00:00`)
    .lt("occurred_at", `${today}T23:59:59.999`)
    .neq("status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toComplimentaryLog);
}

export async function getComplimentaryLog(
  db: SupabaseClient,
  id: string,
): Promise<ComplimentaryLog | null> {
  const { data, error } = await db
    .from("complimentary_logs")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toComplimentaryLog(data);
}

export async function updateComplimentaryStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  reviewedBy: string,
): Promise<void> {
  const { error } = await db
    .from("complimentary_logs")
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteComplimentaryLog(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db
    .from("complimentary_logs")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toComplimentaryLog(row: any): ComplimentaryLog {
  return {
    id: row.id,
    description: row.description,
    amountFils: Number(row.amount_fils),
    reason: row.reason,
    notes: row.notes,
    productId: row.product_id,
    occurredAt: row.occurred_at,
    status: row.status,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
