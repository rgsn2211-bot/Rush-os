import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { settlementConfirmSchema } from "@/lib/validators/money";
import { confirmSettlement, removeSettlement } from "@/services/money";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);
  const { id } = await params;

  const body = await request.json();
  const parsed = settlementConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await confirmSettlement(db, id, parsed.data);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to confirm";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);
  const { id } = await params;

  try {
    await removeSettlement(db, id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
