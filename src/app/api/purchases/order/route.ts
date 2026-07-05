import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { purchaseOrderCreateSchema } from "@/lib/validators/inventory";
import { orderPurchase } from "@/services/purchases";

/** Owner logs an order (status 'ordered') — no stock, no cash, no review. */
export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const body = await request.json();
  const parsed = purchaseOrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await orderPurchase(db, parsed.data, authUser.id);
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to log order";
    return Response.json({ error: message }, { status: 400 });
  }
}
