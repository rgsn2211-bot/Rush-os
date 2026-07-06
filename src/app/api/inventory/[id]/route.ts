import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRoleApi } from "@/lib/auth";
import { inventoryItemCreateSchema } from "@/lib/validators/inventory";
import { getItem, editItem, removeItem } from "@/services/inventory";

// All handlers return / mutate cost data, so owner + pos_manager only.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const item = await getItem(db, id);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = inventoryItemCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await editItem(db, id, parsed.data);
  return Response.json(item);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  await removeItem(db, id);
  return new Response(null, { status: 204 });
}
