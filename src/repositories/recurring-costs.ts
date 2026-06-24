import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecurringCost, RecurringFrequency } from "@/types/money";

export interface InsertRecurringCostInput {
  name: string;
  costType: string;
  amountFils: number;
  frequency: RecurringFrequency;
  nextDueDate: string;
  defaultMethod: string;
  createdBy: string;
}

export async function insertRecurringCost(
  db: SupabaseClient,
  input: InsertRecurringCostInput,
): Promise<RecurringCost> {
  const { data, error } = await db
    .from("recurring_costs")
    .insert({
      name: input.name,
      cost_type: input.costType,
      amount_fils: input.amountFils,
      frequency: input.frequency,
      next_due_date: input.nextDueDate,
      default_method: input.defaultMethod,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toRecurringCost(data);
}

export async function listRecurringCosts(
  db: SupabaseClient,
): Promise<RecurringCost[]> {
  const { data, error } = await db
    .from("recurring_costs")
    .select("*")
    .eq("active", true)
    .order("next_due_date", { ascending: true });

  if (error) throw error;
  return data.map(toRecurringCost);
}

export async function getRecurringCost(
  db: SupabaseClient,
  id: string,
): Promise<RecurringCost | null> {
  const { data, error } = await db
    .from("recurring_costs")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toRecurringCost(data);
}

export async function updateRecurringCost(
  db: SupabaseClient,
  id: string,
  patch: { nextDueDate?: string; active?: boolean },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.nextDueDate !== undefined) update.next_due_date = patch.nextDueDate;
  if (patch.active !== undefined) update.active = patch.active;

  const { error } = await db
    .from("recurring_costs")
    .update(update)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteRecurringCost(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("recurring_costs").delete().eq("id", id);
  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecurringCost(row: any): RecurringCost {
  return {
    id: row.id,
    name: row.name,
    costType: row.cost_type,
    amountFils: Number(row.amount_fils),
    frequency: row.frequency,
    nextDueDate: row.next_due_date,
    defaultMethod: row.default_method,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
