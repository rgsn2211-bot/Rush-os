import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supplierCreateSchema } from "@/lib/validators/inventory";
import { getAllSuppliers, createSupplier } from "@/services/suppliers";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const suppliers = await getAllSuppliers(db);
  return Response.json(suppliers);
}

export async function POST(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = supplierCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supplier = await createSupplier(db, parsed.data, user.id);
  return Response.json(supplier, { status: 201 });
}
