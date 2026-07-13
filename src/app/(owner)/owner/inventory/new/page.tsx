import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllSuppliers } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryItemForm } from "@/features/inventory/inventory-item-form";

export default async function NewInventoryItemPage() {
  const db = await createClient();
  await requireOwner(db);

  const suppliers = await getAllSuppliers(db);

  return (
    <div>
      <Link
        href="/owner/inventory"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to inventory
      </Link>
      <PageHeader
        title="Add Inventory Item"
        subtitle="Start simple — fill in advanced settings later"
      />
      <InventoryItemForm suppliers={suppliers} />
    </div>
  );
}
