import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { dailyClosingCreateSchema } from "@/lib/validators/closing";
import {
  submitDailyClosing,
  computeExpectedCashFils,
} from "@/services/daily-closing";
import { bhdToFils } from "@/lib/calculations/currency";

/**
 * Owner creates (back-fills) a closing for a chosen date. Saved as needs_review,
 * exactly like a worker submission — the owner then approves it, so the money
 * effects post through the single approval path. Owner reads/writes with their
 * own client (owner RLS grants full access, including the cash log).
 */
export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const body = await request.json();
  const parsed = dailyClosingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cashExpectedFils = await computeExpectedCashFils(
      db,
      parsed.data.reportDate,
      bhdToFils(parsed.data.cashSalesBhd),
    );
    const result = await submitDailyClosing(
      db,
      parsed.data,
      authUser.id,
      cashExpectedFils,
    );
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create";
    return Response.json({ error: message }, { status: 400 });
  }
}
