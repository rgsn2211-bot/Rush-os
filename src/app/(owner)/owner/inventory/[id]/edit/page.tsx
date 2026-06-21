import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getItem } from "@/services/inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryItemForm } from "@/features/inventory/inventory-item-form";

export default async function EditInventoryItemPage({
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
  const [item, suppliers] = await Promise.all([
    getItem(db, id),
    getAllSuppliers(db),
  ]);
  if (!item) notFound();

  return (
    <div>
      <Link
        href={`/owner/inventory/${id}`}
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to {item.name}
      </Link>
      <PageHeader
        title={`Edit ${item.name}`}
        subtitle="Update item settings"
      />
      <InventoryItemForm suppliers={suppliers} item={item} />
    </div>
  );
}
