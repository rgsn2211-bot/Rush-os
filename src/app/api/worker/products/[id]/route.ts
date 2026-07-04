import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { workerProductCreateSchema } from "@/lib/validators/inventory";
import { editWorkerProduct, removeWorkerProduct } from "@/services/products";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = workerProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const product = await editWorkerProduct(db, id, parsed.data);
    return Response.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const { id } = await params;
  await removeWorkerProduct(db, id);
  return new Response(null, { status: 204 });
}
