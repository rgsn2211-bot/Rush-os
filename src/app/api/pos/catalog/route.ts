import { createClient } from "@/lib/supabase/server";
import { requireRoleApi } from "@/lib/auth";
import { getPosItemCatalog } from "@/services/pos-mapping";

export async function GET() {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const catalog = await getPosItemCatalog(db);
  return Response.json(catalog);
}
