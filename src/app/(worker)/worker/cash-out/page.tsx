import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { getWorkerTodayCashOuts } from "@/services/register-cash-out";
import { CashOutForm } from "@/features/worker/cash-out-form";

export default async function WorkerCashOutPage() {
  const db = await createClient();
  const authUser = await requireWorker(db);

  const todayCashOuts = await getWorkerTodayCashOuts(db, authUser.id);

  return (
    <div>
      <Link
        href="/worker"
        className="text-ink-3 hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        ← Back
      </Link>
      <h1 className="text-ink mb-1 text-2xl font-bold tracking-tight">
        Cash Out from Register
      </h1>
      <p className="text-ink-3 mb-5 text-[14.5px]">
        Record cash you took from the till — for a purchase or a withdrawal —
        for the owner to review.
      </p>
      <CashOutForm todayCashOuts={todayCashOuts} />
    </div>
  );
}
