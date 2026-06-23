import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { workerPurchaseCreateSchema } from "@/lib/validators/inventory";
import { recordWorkerPurchase } from "@/services/purchases";

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

  try {
    const result = await recordWorkerPurchase(db, parsed.data, authUser.id);
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit";
    return Response.json({ error: message }, { status: 500 });
  }
}
