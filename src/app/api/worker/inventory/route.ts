import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";

export async function GET() {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const items = await listInventoryItemsOps(db);
  return Response.json(items);
}
