import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { WorkerCatalogList } from "@/features/worker/worker-catalog-list";

export default async function WorkerInventoryPage() {
  const db = await createClient();
  await requireWorker(db);
  const items = await listInventoryItemsOps(db);

  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    subtitle: [i.category, `stored in ${i.stockUnit}`]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/worker"
          className="text-ink-3 hover:text-ink mb-2 inline-flex items-center gap-1 text-sm font-medium"
        >
          ← Back
        </Link>
        <h1 className="text-ink text-xl font-bold">Inventory Items</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Browse all stock items. New items and changes are handled by the
          owner or the POS Manager.
        </p>
      </div>
      <WorkerCatalogList rows={rows} emptyText="No inventory items yet." />
    </div>
  );
}
