import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { wasteReviewSchema, wasteEditSchema } from "@/lib/validators/waste";
import { reviewWaste, editWaste, voidApprovedWaste } from "@/services/waste";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = wasteReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === "void") {
      await voidApprovedWaste(db, id, authUser.id);
    } else {
      await reviewWaste(db, id, parsed.data.action, authUser.id);
    }
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

/**
 * Owner corrects a waste entry. Editing an approved one re-adjusts stock and
 * the recorded loss, keeping any adjustment already made to its classification.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = wasteEditSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await editWaste(db, id, parsed.data, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
