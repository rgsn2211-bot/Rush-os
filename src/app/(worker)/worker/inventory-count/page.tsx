import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { getWorkerOwnCounts } from "@/services/inventory-count";
import { InventoryCountForm } from "@/features/worker/inventory-count-form";

export default async function WorkerInventoryCountPage() {
  const db = await createClient();
  const authUser = await requireWorker(db);

  const [items, ownCounts] = await Promise.all([
    listInventoryItemsOps(db),
    getWorkerOwnCounts(db, authUser.id),
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
        Inventory Count
      </h1>
      <p className="text-ink-3 mb-5 text-[14.5px]">
        Count the shelf and enter what you actually find. Leave an item blank to
        skip it. The owner reviews the differences before anything changes.
      </p>
      <InventoryCountForm items={items} ownCounts={ownCounts} />
    </div>
  );
}
