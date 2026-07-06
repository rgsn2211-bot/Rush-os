import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRoleApi } from "@/lib/auth";
import { inventoryItemCreateSchema } from "@/lib/validators/inventory";
import { getAllItems, createItem } from "@/services/inventory";

// Returns cost columns, so owner + pos_manager only. Workers read the
// cost-free view via GET /api/worker/inventory.
export async function GET() {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const items = await getAllItems(db);
  return Response.json(items);
}

export async function POST(request: NextRequest) {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = inventoryItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await createItem(db, parsed.data, auth.id);
  return Response.json(item, { status: 201 });
}
