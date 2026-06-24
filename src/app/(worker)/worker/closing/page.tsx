import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { getClosingForDate } from "@/services/daily-closing";
import { ClosingWizard } from "@/features/worker/closing-wizard";

export default async function WorkerClosingPage() {
  const db = await createClient();
  await requireWorker(db);

  const today = new Date().toISOString().split("T")[0];
  const existing = await getClosingForDate(db, today);

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
      <ClosingWizard today={today} existingStatus={existing?.status ?? null} />
    </div>
  );
}
