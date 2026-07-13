import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { getAllSuppliers } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryItemForm } from "@/features/inventory/inventory-item-form";

export default async function PosManagerNewItemPage() {
  const db = await createClient();
  await requirePosManager(db);

  const suppliers = await getAllSuppliers(db);

  return (
    <div>
      <Link
        href="/pos-manager/inventory"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to inventory
      </Link>
      <PageHeader
        title="Add Inventory Item"
        subtitle="Set the initial cost so recipes can be costed correctly"
      />
      <InventoryItemForm
        suppliers={suppliers}
        successPath="/pos-manager/inventory"
        cancelPath="/pos-manager/inventory"
      />
    </div>
  );
}
