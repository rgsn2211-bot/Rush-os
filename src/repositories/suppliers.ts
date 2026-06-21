import type { SupabaseClient } from "@supabase/supabase-js";
import type { Supplier } from "@/types/inventory";
import type { SupplierCreateInput } from "@/lib/validators/inventory";

export async function listSuppliers(
  db: SupabaseClient,
): Promise<Supplier[]> {
  const { data, error } = await db
    .from("suppliers")
    .select("*")
    .neq("status", "voided")
    .order("name");

  if (error) throw error;
  return data.map(toSupplier);
}

export async function getSupplier(
  db: SupabaseClient,
  id: string,
): Promise<Supplier | null> {
  const { data, error } = await db
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toSupplier(data);
}

export async function insertSupplier(
  db: SupabaseClient,
  input: SupplierCreateInput,
  createdBy: string,
): Promise<Supplier> {
  const { data, error } = await db
    .from("suppliers")
    .insert({
      name: input.name,
      lead_time_days: input.leadTimeDays,
      notes: input.notes ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toSupplier(data);
}

export async function updateSupplier(
  db: SupabaseClient,
  id: string,
  input: Partial<SupplierCreateInput>,
): Promise<Supplier> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.leadTimeDays !== undefined) updates.lead_time_days = input.leadTimeDays;
  if (input.notes !== undefined) updates.notes = input.notes ?? null;

  const { data, error } = await db
    .from("suppliers")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toSupplier(data);
}

export async function voidSupplier(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db
    .from("suppliers")
    .update({ status: "voided" })
    .eq("id", id);

  if (error) throw error;
}

// snake_case DB row -> camelCase domain type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    leadTimeDays: row.lead_time_days,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
