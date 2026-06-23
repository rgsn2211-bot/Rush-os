import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { workerPurchaseCreateSchema } from "@/lib/validators/inventory";
import { recordPurchase } from "@/services/purchases";

export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = workerPurchaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = {
    supplierId: parsed.data.supplierId,
    purchasedOn: parsed.data.purchasedOn,
    isPaid: parsed.data.isPaid,
    items: parsed.data.items,
  };

  const result = await recordPurchase(db, input, authUser.id, "needs_review");
  return Response.json(result, { status: 201 });
}
