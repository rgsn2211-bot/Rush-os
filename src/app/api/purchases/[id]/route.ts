import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { purchaseCreateSchema } from "@/lib/validators/inventory";
import {
  getPurchaseWithItems,
  cancelPurchase,
  updatePurchase,
} from "@/services/purchases";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await getPurchaseWithItems(db, id);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);
  const { id } = await params;

  const body = await request.json();
  const parsed = purchaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await updatePurchase(db, id, parsed.data, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await cancelPurchase(db, id);
  return new Response(null, { status: 204 });
}
