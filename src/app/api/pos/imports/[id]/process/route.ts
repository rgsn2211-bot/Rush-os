import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { processImportInventory } from "@/services/pos-import";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;

  try {
    const result = await processImportInventory(db, id);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
