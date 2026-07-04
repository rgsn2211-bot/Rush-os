import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireWorker } from "@/lib/auth";
import { getWorkerProductForEdit } from "@/services/products";
import { getAllProductGroups } from "@/services/product-groups";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { WorkerProductForm } from "@/features/worker/worker-product-form";

export default async function EditWorkerProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requireWorker(db);

  const { id } = await params;
  // Admin read so the recipe loads for products the worker didn't create
  // (recipe_ingredients holds qty only — no cost data).
  const [loaded, items, groups] = await Promise.all([
    getWorkerProductForEdit(createAdminClient(), id),
    listInventoryItemsOps(db),
    getAllProductGroups(db),
  ]);
  if (!loaded) notFound();

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/worker/products"
          className="text-ink-3 hover:text-ink mb-2 inline-flex items-center gap-1 text-sm font-medium"
        >
          ← Back to products
        </Link>
        <h1 className="text-ink text-xl font-bold">Edit {loaded.product.name}</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Changes are usable right away and the owner reviews them.
        </p>
      </div>
      <WorkerProductForm
        items={items}
        groups={groups}
        product={loaded.product}
        existingRecipe={loaded.recipe}
      />
    </div>
  );
}
