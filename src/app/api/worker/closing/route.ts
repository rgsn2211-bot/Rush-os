import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth";
import { dailyClosingCreateSchema } from "@/lib/validators/closing";
import {
  submitDailyClosing,
  computeExpectedCashFils,
  getClosingForDate,
} from "@/services/daily-closing";
import { bhdToFils } from "@/lib/calculations/currency";

export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = dailyClosingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // Expected drawer cash needs the cash log, which workers can't read under
    // RLS — compute it with the service-role client, then store the closing as
    // the worker (so RLS still gates the insert).
    const admin = createAdminClient();

    // A worker can't see closings created by others under RLS, so check for an
    // existing closing on this date with the admin client — a clean 400 instead
    // of a raw unique-index error.
    const existing = await getClosingForDate(admin, parsed.data.reportDate);
    if (existing) {
      return Response.json(
        { error: "A closing for this date already exists" },
        { status: 400 },
      );
    }

    const cashExpectedFils = await computeExpectedCashFils(
      admin,
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
    const message = err instanceof Error ? err.message : "Failed to submit";
    return Response.json({ error: message }, { status: 400 });
  }
}
