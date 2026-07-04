import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { getItemOps } from "@/services/inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { WorkerItemForm } from "@/features/worker/worker-item-form";

export default async function EditWorkerItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requireWorker(db);

  const { id } = await params;
  const [item, suppliers] = await Promise.all([
    getItemOps(db, id),
    getAllSuppliers(db),
  ]);
  if (!item) notFound();

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/worker/inventory"
          className="text-ink-3 hover:text-ink mb-2 inline-flex items-center gap-1 text-sm font-medium"
        >
          ← Back to items
        </Link>
        <h1 className="text-ink text-xl font-bold">Edit {item.name}</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Changes are usable right away and the owner reviews them.
        </p>
      </div>
      <WorkerItemForm suppliers={suppliers} item={item} />
    </div>
  );
}
