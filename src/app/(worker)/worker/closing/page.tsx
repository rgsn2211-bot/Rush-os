import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireWorker } from "@/lib/auth";
import {
  getNonVoidedClosingDates,
  getRegisterCashBalance,
} from "@/services/daily-closing";
import { getPlatformsForWorker } from "@/services/delivery";
import { todayInBahrain } from "@/lib/dates";
import { ClosingWizard } from "@/features/worker/closing-wizard";

export default async function WorkerClosingPage() {
  const db = await createClient();
  await requireWorker(db);

  const today = todayInBahrain();
  const admin = createAdminClient();
  // Dates that already have a closing (any user), so the picker can disable them.
  // Only dates are read with the admin client — no financial figures.
  const [closedDates, platforms, registerCashFils] = await Promise.all([
    getNonVoidedClosingDates(admin),
    getPlatformsForWorker(db),
    getRegisterCashBalance(admin),
  ]);

  return (
    <div>
      <Link
        href="/worker"
        className="text-ink-3 hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        ← Back
      </Link>
      <h1 className="text-ink mb-1 text-2xl font-bold tracking-tight">
        Daily Closing
      </h1>
      <p className="text-ink-3 mb-5 text-[14.5px]">
        Close out the day&apos;s sales and cash for the owner to review.
      </p>
      <ClosingWizard
        today={today}
        closedDates={closedDates}
        platforms={platforms}
        registerCashFils={registerCashFils}
      />
    </div>
  );
}
