import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  inventoryCountReviewSchema,
  inventoryCountEditSchema,
} from "@/lib/validators/inventory-count";
import {
  reviewCount,
  editCount,
  voidApprovedCount,
  deleteCountAsOwner,
} from "@/services/inventory-count";

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
    if (parsed.data.action === "void") {
      await voidApprovedCount(db, id, authUser.id);
    } else {
      await reviewCount(db, id, parsed.data.action, authUser.id);
    }
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

/**
 * Owner corrects a count — pending or already approved. Editing an approved
 * count re-runs the reconciliation so stock follows the corrected numbers, and
 * re-dates its loss to the chosen business date.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = inventoryCountEditSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await editCount(db, id, parsed.data, authUser.id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

/**
 * Owner removes the count record while KEEPING the stock adjustment it made
 * (mis-entered counts the owner already used to fix stock).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  try {
    await deleteCountAsOwner(db, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
