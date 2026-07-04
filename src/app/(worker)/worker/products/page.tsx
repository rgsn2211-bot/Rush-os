import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { getAllProducts } from "@/services/products";
import { getAllProductGroups } from "@/services/product-groups";
import { formatFils } from "@/lib/calculations/currency";
import { WorkerSubmissions } from "@/features/worker/worker-submissions";

export default async function WorkerProductsPage() {
  const db = await createClient();
  await requireWorker(db);

  const [products, groups] = await Promise.all([
    getAllProducts(db),
    getAllProductGroups(db),
  ]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    subtitle: [
      p.groupId ? groupName.get(p.groupId) : null,
      p.priceFils > 0 ? `${formatFils(p.priceFils)} BHD` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    status: p.status,
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
        <h1 className="text-ink text-xl font-bold">Products</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Tap any product to edit it. Changes are usable right away and the owner
          reviews them.
        </p>
      </div>
      <WorkerSubmissions
        rows={rows}
        editBase="/worker/products"
        apiBase="/api/worker/products"
        addHref="/worker/products/new"
        addLabel="Create Product"
        emptyText="No products yet."
      />
    </div>
  );
}
