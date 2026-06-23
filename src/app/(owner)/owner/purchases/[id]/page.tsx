import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPurchaseWithItems } from "@/services/purchases";
import { getSupplierById } from "@/services/suppliers";
import { getAllItems } from "@/services/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoidPurchaseButton } from "@/features/purchases/void-purchase-button";

export default async function PurchaseDetailPage({
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
  const data = await getPurchaseWithItems(db, id);
  if (!data) notFound();

  const { purchase, items } = data;
  const [supplier, inventoryItems] = await Promise.all([
    purchase.supplierId ? getSupplierById(db, purchase.supplierId) : null,
    getAllItems(db),
  ]);
  const itemNames = new Map(inventoryItems.map((i) => [i.id, i]));

  return (
    <div>
      <Link
        href="/owner/purchases"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to purchases
      </Link>

      <PageHeader
        title={`Purchase · ${new Date(purchase.purchasedOn).toLocaleDateString()}`}
        subtitle={supplier ? supplier.name : "No supplier"}
        actions={<VoidPurchaseButton purchaseId={purchase.id} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-0">
          <div className="border-line-2 border-b px-5 py-4">
            <h2 className="text-base font-bold">Items received</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line-2 border-b">
                  <th className="text-ink-3 px-5 py-2.5 text-left text-xs font-semibold uppercase">
                    Item
                  </th>
                  <th className="text-ink-3 px-3 py-2.5 text-right text-xs font-semibold uppercase">
                    Qty
                  </th>
                  <th className="text-ink-3 px-3 py-2.5 text-right text-xs font-semibold uppercase">
                    Added to stock
                  </th>
                  <th className="text-ink-3 px-5 py-2.5 text-right text-xs font-semibold uppercase">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((pi) => {
                  const item = itemNames.get(pi.inventoryItemId);
                  return (
                    <tr key={pi.id} className="border-line-2 border-b last:border-b-0">
                      <td className="px-5 py-3">
                        {item ? (
                          <Link
                            href={`/owner/inventory/${item.id}`}
                            className="hover:text-navy font-semibold"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <span className="font-semibold">Unknown item</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {pi.purchaseQty} {item?.purchaseUnit ?? ""}
                      </td>
                      <td className="text-ink-2 px-3 py-3 text-right font-mono">
                        {pi.baseQty} {item?.baseUnit ?? ""}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">
                        {formatFils(pi.lineTotalFils)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-4">
            <span className="text-[14.5px] font-bold">Purchase total</span>
            <span className="font-mono text-base font-bold">
              {formatFils(purchase.totalFils)}{" "}
              <span className="text-ink-3 text-xs">BHD</span>
            </span>
          </div>
        </Card>

        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-3 text-[15px] font-bold">Details</h3>
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Date</span>
                <span className="font-semibold">
                  {new Date(purchase.purchasedOn).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Supplier</span>
                <span className="font-semibold">
                  {supplier ? supplier.name : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2">Payment</span>
                {purchase.isPaid ? (
                  <Badge variant="green">Paid</Badge>
                ) : (
                  <Badge variant="amber">Unpaid</Badge>
                )}
              </div>
              {!purchase.isPaid && purchase.dueDate && (
                <div className="flex justify-between">
                  <span className="text-ink-2">Due</span>
                  <span className="font-semibold">
                    {new Date(purchase.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="text-ink-3 border-line-2 mt-4 border-t pt-3 text-xs">
              Recorded {new Date(purchase.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
