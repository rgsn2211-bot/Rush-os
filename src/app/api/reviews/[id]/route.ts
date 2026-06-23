import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { purchaseApproveSchema } from "@/lib/validators/inventory";
import { approvePurchase, rejectPurchase } from "@/services/purchases";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = purchaseApproveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await approvePurchase(db, id, parsed.data);
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  await rejectPurchase(db, id);
  return new Response(null, { status: 204 });
}
