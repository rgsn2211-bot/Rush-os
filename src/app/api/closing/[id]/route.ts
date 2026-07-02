import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  dailyClosingReviewSchema,
  dailyClosingUpdateSchema,
} from "@/lib/validators/closing";
import { reviewClosing, updateClosing } from "@/services/daily-closing";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = dailyClosingReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await reviewClosing(db, id, parsed.data.action, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

/** Owner edits a closing's figures (pending or approved). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = dailyClosingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await updateClosing(db, id, parsed.data, authUser.id);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
