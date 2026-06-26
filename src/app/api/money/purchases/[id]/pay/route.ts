import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { payPurchase } from "@/services/money";

const paySchema = z.object({
  paidMethod: z.enum(["cash", "bank"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);
  const { id } = await params;

  const body = await request.json();
  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await payPurchase(db, id, parsed.data.paidMethod, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark paid";
    return Response.json({ error: message }, { status: 400 });
  }
}
