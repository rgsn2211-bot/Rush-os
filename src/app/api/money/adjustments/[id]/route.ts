import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { removeBalanceAdjustment } from "@/services/money";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  try {
    await removeBalanceAdjustment(db, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return Response.json({ error: message }, { status: 400 });
  }
}
