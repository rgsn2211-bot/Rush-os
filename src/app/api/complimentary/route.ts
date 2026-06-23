import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllComplimentaryLogs } from "@/services/complimentary";

export async function GET() {
  const db = await createClient();
  await requireOwner(db);

  const logs = await getAllComplimentaryLogs(db);
  return Response.json(logs);
}
