import type { SupabaseClient } from "@supabase/supabase-js";
import type { Supplier } from "@/types/inventory";
import type { SupplierCreateInput } from "@/lib/validators/inventory";
import {
  listSuppliers,
  getSupplier,
  insertSupplier,
  updateSupplier,
  voidSupplier,
} from "@/repositories/suppliers";

export async function getAllSuppliers(
  db: SupabaseClient,
): Promise<Supplier[]> {
  return listSuppliers(db);
}

export async function getSupplierById(
  db: SupabaseClient,
  id: string,
): Promise<Supplier | null> {
  return getSupplier(db, id);
}

export async function createSupplier(
  db: SupabaseClient,
  input: SupplierCreateInput,
  createdBy: string,
): Promise<Supplier> {
  return insertSupplier(db, input, createdBy);
}

export async function editSupplier(
  db: SupabaseClient,
  id: string,
  input: Partial<SupplierCreateInput>,
): Promise<Supplier> {
  return updateSupplier(db, id, input);
}

export async function removeSupplier(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return voidSupplier(db, id);
}
