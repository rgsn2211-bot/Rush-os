import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inventoryItemCreateSchema } from "@/lib/validators/inventory";
import { getAllItems, createItem } from "@/services/inventory";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getAllItems(db);
  return Response.json(items);
}

export async function POST(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = inventoryItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await createItem(db, parsed.data, user.id);
  return Response.json(item, { status: 201 });
}
