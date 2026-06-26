import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { cashTransferSchema } from "@/lib/validators/money";
import { transferToBank } from "@/services/money";

export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const body = await request.json();
  const parsed = cashTransferSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await transferToBank(db, parsed.data, authUser.id);
    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfer failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
