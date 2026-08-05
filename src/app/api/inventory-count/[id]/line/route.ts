import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { countLineActionSchema } from "@/lib/validators/inventory-count";
import {
  excludeCountLine,
  restoreCountLine,
} from "@/services/inventory-count";

/**
 * Owner acts on a single line of an approved count — excluding it from the
 * reports (keeping or reverting its stock change) or restoring it — without
 * disturbing the other lines' reconciliation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const { id } = await params;
  const body = await request.json();
  const parsed = countLineActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { inventoryItemId, action } = parsed.data;

  try {
    if (action === "restore") {
      await restoreCountLine(db, id, inventoryItemId);
    } else {
      await excludeCountLine(
        db,
        id,
        inventoryItemId,
        { revertStock: action === "exclude_revert_stock" },
        authUser.id,
      );
    }
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
