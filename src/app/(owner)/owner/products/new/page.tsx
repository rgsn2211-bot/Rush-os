import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllItems } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/features/products/product-form";

export default async function NewProductPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const items = await getAllItems(db);

  return (
    <div>
      <Link
        href="/owner/products"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to products
      </Link>
      <PageHeader
        title="Add Product"
        subtitle="Each size or hot/cold variant is a separate product"
      />
      <ProductForm inventoryItems={items} />
    </div>
  );
}
