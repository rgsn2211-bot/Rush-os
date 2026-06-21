import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productCreateSchema } from "@/lib/validators/inventory";
import {
  getProductWithCost,
  editProduct,
  removeProduct,
} from "@/services/products";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await getProductWithCost(db, id);
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(product);
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
  const parsed = productCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const product = await editProduct(db, id, parsed.data);
  return Response.json(product);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await removeProduct(db, id);
  return new Response(null, { status: 204 });
}
