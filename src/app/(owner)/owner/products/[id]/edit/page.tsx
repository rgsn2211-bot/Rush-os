import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProductWithCost } from "@/services/products";
import { getAllItems } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/features/products/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [product, items] = await Promise.all([
    getProductWithCost(db, id),
    getAllItems(db),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link
        href={`/owner/products/${id}`}
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to {product.name}
      </Link>
      <PageHeader
        title={`Edit ${product.name}`}
        subtitle="Update product details and recipe"
      />
      <ProductForm
        inventoryItems={items}
        product={product}
        existingRecipe={product.recipe}
      />
    </div>
  );
}
