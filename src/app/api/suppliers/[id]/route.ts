import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supplierCreateSchema } from "@/lib/validators/inventory";
import { getSupplierById, editSupplier, removeSupplier } from "@/services/suppliers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supplier = await getSupplierById(db, id);
  if (!supplier) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(supplier);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = supplierCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supplier = await editSupplier(db, id, parsed.data);
  return Response.json(supplier);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await removeSupplier(db, id);
  return new Response(null, { status: 204 });
}
