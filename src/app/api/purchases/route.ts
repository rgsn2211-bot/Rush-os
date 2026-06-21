import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purchaseCreateSchema } from "@/lib/validators/inventory";
import { getAllPurchases, recordPurchase } from "@/services/purchases";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const purchases = await getAllPurchases(db);
  return Response.json(purchases);
}

export async function POST(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = purchaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await recordPurchase(db, parsed.data, user.id);
  return Response.json(result, { status: 201 });
}
