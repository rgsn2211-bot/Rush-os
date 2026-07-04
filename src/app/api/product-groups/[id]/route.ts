import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productGroupCreateSchema } from "@/lib/validators/inventory";
import { editProductGroup, removeProductGroup } from "@/services/product-groups";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = productGroupCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await editProductGroup(db, id, parsed.data);
  return Response.json(group);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await removeProductGroup(db, id);
  return new Response(null, { status: 204 });
}
