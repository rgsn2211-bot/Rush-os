import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { inventoryItemReviewSchema } from "@/lib/validators/inventory";
import { approveInventoryItem, rejectInventoryItem } from "@/services/inventory";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "owner") {
    return Response.json({ error: "Owners only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = inventoryItemReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const item =
      parsed.data.action === "approve"
        ? await approveInventoryItem(db, id, authUser.id, {
            defaultCostFils: parsed.data.defaultCostFils,
            costingMethod: parsed.data.costingMethod,
          })
        : await rejectInventoryItem(db, id, authUser.id);
    return Response.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to review";
    return Response.json({ error: message }, { status: 400 });
  }
}
