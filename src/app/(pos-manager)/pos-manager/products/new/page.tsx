import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { getAllItems } from "@/services/inventory";
import { getAllProductGroups } from "@/services/product-groups";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/features/products/product-form";

export default async function PosManagerNewProductPage() {
  const db = await createClient();
  await requirePosManager(db);

  const [items, groups] = await Promise.all([
    getAllItems(db),
    getAllProductGroups(db),
  ]);

  return (
    <div>
      <Link
        href="/pos-manager/products"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to products
      </Link>
      <PageHeader
        title="Add Product"
        subtitle="Each size or hot/cold variant is a separate product"
      />
      <ProductForm
        inventoryItems={items}
        groups={groups}
        successPath="/pos-manager/products"
        cancelPath="/pos-manager/products"
      />
    </div>
  );
}
