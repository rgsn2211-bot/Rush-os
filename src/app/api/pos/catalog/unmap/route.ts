import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRoleApi } from "@/lib/auth";
import { posUnmapItemSchema } from "@/lib/validators/pos";
import { unmapPosItem } from "@/services/pos-mapping";

export async function POST(request: NextRequest) {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = posUnmapItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await unmapPosItem(db, parsed.data.posItemId);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unmap failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
