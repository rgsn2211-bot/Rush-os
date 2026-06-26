import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { deliveryPlatformCreateSchema } from "@/lib/validators/delivery";
import { createPlatform } from "@/services/delivery";

export async function POST(request: NextRequest) {
  const db = await createClient();
  await requireOwner(db);

  const body = await request.json();
  const parsed = deliveryPlatformCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await createPlatform(db, parsed.data);
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save";
    return Response.json({ error: message }, { status: 400 });
  }
}
