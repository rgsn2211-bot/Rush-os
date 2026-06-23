import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPosItemCatalog } from "@/services/pos-mapping";

export async function GET() {
  const db = await createClient();
  await requireOwner(db);

  const catalog = await getPosItemCatalog(db);
  return Response.json(catalog);
}
