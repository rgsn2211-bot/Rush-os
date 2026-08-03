import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { getItem, getItemDeletionImpact } from "@/services/inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryItemForm } from "@/features/inventory/inventory-item-form";
import { DeleteItemButton } from "@/features/inventory/delete-item-button";

export default async function PosManagerEditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requirePosManager(db);

  const { id } = await params;
  const [item, suppliers, impact] = await Promise.all([
    getItem(db, id),
    getAllSuppliers(db),
    getItemDeletionImpact(db, id),
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

      {impact && (
        <Card className="mt-5">
          <CardContent>
            <h2 className="text-ink text-base font-bold">Delete item</h2>
            <p className="text-ink-3 mt-1 mb-3 text-sm">
              Hides the item everywhere going forward. All past purchases,
              waste, counts and COGS stay exactly as they are.
            </p>
            <DeleteItemButton
              itemId={item.id}
              impact={impact}
              redirectTo="/pos-manager/inventory"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
