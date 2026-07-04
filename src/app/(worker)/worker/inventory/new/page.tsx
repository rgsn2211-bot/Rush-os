import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { getAllSuppliers } from "@/services/suppliers";
import { WorkerItemForm } from "@/features/worker/worker-item-form";

export default async function NewWorkerItemPage() {
  const db = await createClient();
  await requireWorker(db);
  const suppliers = await getAllSuppliers(db);

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/worker/inventory"
          className="text-ink-3 hover:text-ink mb-2 inline-flex items-center gap-1 text-sm font-medium"
        >
          ← Back to items
        </Link>
        <h1 className="text-ink text-xl font-bold">Add Inventory Item</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          The owner sets the cost and reviews it — no need to wait.
        </p>
      </div>
      <WorkerItemForm suppliers={suppliers} />
    </div>
  );
}
