import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { settlementReconcileSchema } from "@/lib/validators/money";
import { reconcileSettlements } from "@/services/money";

export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const body = await request.json();
  const parsed = settlementReconcileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await reconcileSettlements(
      db,
      parsed.data.ids,
      parsed.data.receivedTotalBhd,
      parsed.data.receivedOn,
      authUser.id,
    );
    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reconcile failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
