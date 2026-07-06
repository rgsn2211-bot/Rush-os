import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { getAllProducts } from "@/services/products";
import { getAllProductGroups } from "@/services/product-groups";
import { formatFils } from "@/lib/calculations/currency";
import { WorkerCatalogList } from "@/features/worker/worker-catalog-list";

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
          Browse the menu and product list. New products and changes are
          handled by the owner or the POS Manager.
        </p>
      </div>
      <WorkerCatalogList rows={rows} emptyText="No products yet." />
    </div>
  );
}
