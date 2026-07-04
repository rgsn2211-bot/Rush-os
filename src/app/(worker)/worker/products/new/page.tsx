import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { getAllProductGroups } from "@/services/product-groups";
import { WorkerProductForm } from "@/features/worker/worker-product-form";

export default async function NewWorkerProductPage() {
  const db = await createClient();
  await requireWorker(db);

  const [items, groups] = await Promise.all([
    listInventoryItemsOps(db),
    getAllProductGroups(db),
  ]);

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/worker/products"
          className="text-ink-3 hover:text-ink mb-2 inline-flex items-center gap-1 text-sm font-medium"
        >
          ← Back to products
        </Link>
        <h1 className="text-ink text-xl font-bold">Create Product</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Pick the inventory it uses each time it&apos;s made.
        </p>
      </div>
      <WorkerProductForm items={items} groups={groups} />
    </div>
  );
}
