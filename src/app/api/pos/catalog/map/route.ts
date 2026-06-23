import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { posMapItemSchema } from "@/lib/validators/pos";
import { mapPosItem } from "@/services/pos-mapping";

export async function POST(request: NextRequest) {
  const db = await createClient();
  await requireOwner(db);

  const body = await request.json();
  const parsed = posMapItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await mapPosItem(db, parsed.data.posItemId, parsed.data.productId);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mapping failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
