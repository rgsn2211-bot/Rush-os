import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  settlementPayoutSchema,
  settlementCommissionSchema,
} from "@/lib/validators/money";
import { recordPayout, recordCommission } from "@/services/money";

export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireOwner(db);

  const body = await request.json();
  const kind = body?.kind;

  try {
    if (kind === "commission") {
      const parsed = settlementCommissionSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      await recordCommission(db, parsed.data, authUser.id);
    } else if (kind === "payout") {
      const parsed = settlementPayoutSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      await recordPayout(db, parsed.data, authUser.id);
    } else {
      return Response.json(
        { error: "kind must be 'payout' or 'commission'" },
        { status: 400 },
      );
    }
    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record";
    return Response.json({ error: message }, { status: 400 });
  }
}
