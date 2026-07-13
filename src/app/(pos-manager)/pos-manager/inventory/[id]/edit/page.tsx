import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { getItem } from "@/services/inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryItemForm } from "@/features/inventory/inventory-item-form";

export default async function PosManagerEditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requirePosManager(db);

  const { id } = await params;
  const [item, suppliers] = await Promise.all([
    getItem(db, id),
    getAllSuppliers(db),
  ]);
  if (!item) notFound();

  return (
    <div>
      <Link
        href="/pos-manager/inventory"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to inventory
      </Link>
      <PageHeader
        title={`Edit ${item.name}`}
        subtitle="Update item settings"
      />
      <InventoryItemForm
        suppliers={suppliers}
        item={item}
        successPath="/pos-manager/inventory"
        cancelPath="/pos-manager/inventory"
      />
    </div>
  );
}
