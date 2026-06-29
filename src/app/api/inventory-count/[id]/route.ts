import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { inventoryCountReviewSchema } from "@/lib/validators/inventory-count";
import { reviewCount } from "@/services/inventory-count";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = inventoryCountReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await reviewCount(db, id, parsed.data.action, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
