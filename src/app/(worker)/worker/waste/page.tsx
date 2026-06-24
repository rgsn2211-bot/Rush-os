import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { getWorkerTodayWaste } from "@/services/waste";
import { WasteForm } from "@/features/worker/waste-form";

export default async function WorkerWastePage() {
  const db = await createClient();
  const authUser = await requireWorker(db);

  const [items, todayLogs] = await Promise.all([
    listInventoryItemsOps(db),
    getWorkerTodayWaste(db, authUser.id),
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
        Record Waste
      </h1>
      <p className="text-ink-3 mb-5 text-[14.5px]">
        Log spoiled, damaged, or expired stock for the owner to review.
      </p>
      <WasteForm items={items} todayLogs={todayLogs} />
    </div>
  );
}
