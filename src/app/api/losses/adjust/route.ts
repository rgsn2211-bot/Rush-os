import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  reclassifyUsageSchema,
  revertUsageSchema,
} from "@/lib/validators/reports";
import {
  reclassifyUsage,
  revertReclassification,
} from "@/services/loss-adjustments";

/** Owner marks a loss as "not really a loss" (whole record or part of one). */
export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const body = await request.json();
  const parsed = reclassifyUsageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await reclassifyUsage(db, parsed.data, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adjustment failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

/** Owner undoes an adjustment. */
export async function DELETE(request: NextRequest) {
  const db = await createClient();
  await requireOwner(db);

  const body = await request.json();
  const parsed = revertUsageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await revertReclassification(db, parsed.data.usageId);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Revert failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
