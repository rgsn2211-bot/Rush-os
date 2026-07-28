import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPurchaseWithItems } from "@/services/purchases";
import { getAllItems } from "@/services/inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { PurchaseEditForm } from "@/features/purchases/purchase-edit-form";

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  const data = await getPurchaseWithItems(db, id);
  if (!data || data.purchase.status === "voided") notFound();

  const [suppliers, inventoryItems] = await Promise.all([
    getAllSuppliers(db),
    getAllItems(db),
  ]);

  return (
    <div>
      <Link
        href={`/owner/purchases/${id}`}
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to purchase
      </Link>
      <PageHeader
        title="Edit purchase"
        subtitle="Correct the supplier, dates, payment, or items"
      />
      <PurchaseEditForm
        purchase={data.purchase}
        items={data.items}
        inventoryItems={inventoryItems}
        suppliers={suppliers}
      />
    </div>
  );
}
