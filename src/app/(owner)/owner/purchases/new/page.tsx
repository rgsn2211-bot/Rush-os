import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllItems } from "@/services/inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { PurchaseForm } from "@/features/purchases/purchase-form";

export default async function NewPurchasePage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const [items, suppliers] = await Promise.all([
    getAllItems(db),
    getAllSuppliers(db),
  ]);

  return (
    <div>
      <Link
        href="/owner/purchases"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to purchases
      </Link>
      <PageHeader
        title="Receive Stock"
        subtitle="Record a purchase to update stock and average costs"
      />
      <PurchaseForm inventoryItems={items} suppliers={suppliers} />
    </div>
  );
}
