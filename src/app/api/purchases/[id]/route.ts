import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPurchaseWithItems,
  cancelPurchase,
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
