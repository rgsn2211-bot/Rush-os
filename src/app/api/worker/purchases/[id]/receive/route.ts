import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { purchaseReceiveSchema } from "@/lib/validators/inventory";
import { receivePurchaseByWorker } from "@/services/purchases";

/** Worker marks an open order received — moves it to needs_review (no stock). */
export async function POST(
  request: NextRequest,
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
  const body = await request.json();
  const parsed = purchaseReceiveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await receivePurchaseByWorker(db, id, parsed.data, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to receive";
    return Response.json({ error: message }, { status: 400 });
  }
}
