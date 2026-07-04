import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { getMyItems } from "@/services/inventory";
import { WorkerSubmissions } from "@/features/worker/worker-submissions";

export default async function WorkerInventoryPage() {
  const db = await createClient();
  const authUser = await requireWorker(db);
  const items = await getMyItems(db, authUser.id);

  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    subtitle: [i.category, `stored in ${i.stockUnit}`]
      .filter(Boolean)
      .join(" · "),
    status: i.status,
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
          Items you&apos;ve added. New ones are usable right away; the owner
          reviews them.
        </p>
      </div>
      <WorkerSubmissions
        rows={rows}
        editBase="/worker/inventory"
        apiBase="/api/worker/inventory"
        addHref="/worker/inventory/new"
        addLabel="Add Item"
        emptyText="You haven't added any items yet."
      />
    </div>
  );
}
