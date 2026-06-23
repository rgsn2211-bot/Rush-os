import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listProducts } from "@/repositories/products";
import { getWorkerTodayLogs } from "@/services/complimentary";
import { ComplimentaryForm } from "@/features/worker/complimentary-form";

export default async function WorkerComplimentaryPage() {
  const db = await createClient();
  const authUser = await requireWorker(db);

  const [products, todayLogs] = await Promise.all([
    listProducts(db),
    getWorkerTodayLogs(db, authUser.id),
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
        Log Complimentary
      </h1>
      <p className="text-ink-3 mb-5 text-[14.5px]">
        Record any free items given out today.
      </p>
      <ComplimentaryForm products={products} todayLogs={todayLogs} />
    </div>
  );
}
