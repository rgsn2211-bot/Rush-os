import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { markRecurringPaid } from "@/services/money";
import { recurringPaySchema } from "@/lib/validators/money";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);
  const { id } = await params;

  // Body is optional — no body means pay a single period.
  const body = await request.json().catch(() => ({}));
  const parsed = recurringPaySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await markRecurringPaid(db, id, parsed.data.periods, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark paid";
    return Response.json({ error: message }, { status: 400 });
  }
}
