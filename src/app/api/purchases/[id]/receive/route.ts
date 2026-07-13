import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { purchaseReceiveSchema } from "@/lib/validators/inventory";
import { receivePurchaseByOwner } from "@/services/purchases";

/** Owner receives an open order — auto-approves and lands stock immediately. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);
  const { id } = await params;

  const body = await request.json();
  const parsed = purchaseReceiveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await receivePurchaseByOwner(db, id, parsed.data, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to receive";
    return Response.json({ error: message }, { status: 400 });
  }
}
