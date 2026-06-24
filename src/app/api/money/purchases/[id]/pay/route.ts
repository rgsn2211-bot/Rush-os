import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { payPurchase } from "@/services/money";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);
  const { id } = await params;

  try {
    await payPurchase(db, id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark paid";
    return Response.json({ error: message }, { status: 400 });
  }
}
