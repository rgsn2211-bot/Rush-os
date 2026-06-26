import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { deliveryPlatformUpdateSchema } from "@/lib/validators/delivery";
import { editPlatform } from "@/services/delivery";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);
  const { id } = await params;

  const body = await request.json();
  const parsed = deliveryPlatformUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await editPlatform(db, id, parsed.data);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
