import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPurchaseWithItems } from "@/services/purchases";
import { getSupplierById } from "@/services/suppliers";
import { getAllItems } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { PurchaseReviewDetail } from "@/features/reviews/purchase-review-detail";


export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  const data = await getPurchaseWithItems(db, id);
  if (!data) notFound();

  const { purchase, items } = data;

  if (purchase.status !== "needs_review") {
    redirect("/owner/review");
  }

  const [supplier, inventoryItems] = await Promise.all([
    purchase.supplierId ? getSupplierById(db, purchase.supplierId) : null,
    getAllItems(db),
  ]);

  const { data: profile } = purchase.createdBy
    ? await db
        .from("profiles")
        .select("display_name")
        .eq("id", purchase.createdBy)
        .single()
    : { data: null };

  return (
    <div>
      <Link
        href="/owner/review"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to Review Center
      </Link>

      <PageHeader
        title={purchase.isPaid ? "Cash Purchase" : "Supplier Delivery"}
        subtitle={`Submitted ${new Date(purchase.createdAt).toLocaleDateString()}`}
        actions={<Badge variant="amber">Needs review</Badge>}
      />

      <PurchaseReviewDetail
        purchase={purchase}
        items={items}
        inventoryItems={inventoryItems}
        supplier={supplier}
        submitterName={profile?.display_name ?? null}
      />
    </div>
  );
}
