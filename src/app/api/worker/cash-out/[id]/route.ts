import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { deleteOwnCashOut } from "@/services/register-cash-out";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteOwnCashOut(db, id, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
