import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getClosingReviewDetails } from "@/services/daily-closing";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  try {
    const details = await getClosingReviewDetails(db, id);
    return Response.json(details);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return Response.json({ error: message }, { status: 400 });
  }
}
