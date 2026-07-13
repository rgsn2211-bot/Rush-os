import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { getProductWithCost } from "@/services/products";
import { getAllItems } from "@/services/inventory";
import { getAllProductGroups } from "@/services/product-groups";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/features/products/product-form";

export default async function PosManagerEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requirePosManager(db);

  const { id } = await params;
  const [product, items, groups] = await Promise.all([
    getProductWithCost(db, id),
    getAllItems(db),
    getAllProductGroups(db),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link
        href="/pos-manager/products"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to products
      </Link>
      <PageHeader
        title={`Edit ${product.name}`}
        subtitle="Update product details and recipe"
      />
      <ProductForm
        inventoryItems={items}
        groups={groups}
        product={product}
        existingRecipe={product.recipe}
        successPath="/pos-manager/products"
        cancelPath="/pos-manager/products"
      />
    </div>
  );
}
