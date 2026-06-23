import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPendingPurchases } from "@/services/purchases";

export async function GET() {
  const db = await createClient();
  await requireOwner(db);

  const pending = await getPendingPurchases(db);
  return Response.json(pending);
}
