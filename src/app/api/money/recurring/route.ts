import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { recurringCostCreateSchema } from "@/lib/validators/money";
import { recordRecurringCost } from "@/services/money";

export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const body = await request.json();
  const parsed = recurringCostCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await recordRecurringCost(db, parsed.data, authUser.id);
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save";
    return Response.json({ error: message }, { status: 400 });
  }
}
