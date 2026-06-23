import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupplierById } from "@/services/suppliers";
import { getAllItems } from "@/services/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SupplierDetailPage({
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
  const [supplier, items] = await Promise.all([
    getSupplierById(db, id),
    getAllItems(db),
  ]);
  if (!supplier) notFound();

  const suppliedItems = items.filter((i) => i.supplierId === supplier.id);

  return (
    <div>
      <Link
        href="/owner/suppliers"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to suppliers
      </Link>

      <PageHeader
        title={supplier.name}
        subtitle={`${supplier.leadTimeDays} ${supplier.leadTimeDays === 1 ? "day" : "days"} lead time`}
        actions={
          <Link href={`/owner/suppliers/${supplier.id}/edit`}>
            <Button>Edit Supplier</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          {supplier.notes && (
            <Card>
              <CardContent>
                <h2 className="text-ink mb-2 text-base font-bold">Notes</h2>
                <p className="text-ink-2 text-sm whitespace-pre-wrap">
                  {supplier.notes}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="p-0">
            <div className="border-line-2 border-b px-5 py-4">
              <h2 className="text-base font-bold">
                Items from this supplier ({suppliedItems.length})
              </h2>
            </div>
            {suppliedItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {suppliedItems.map((item) => (
                      <tr key={item.id} className="border-line-2 border-b last:border-b-0">
                        <td className="px-5 py-3">
                          <Link
                            href={`/owner/inventory/${item.id}`}
                            className="hover:text-navy font-semibold"
                          >
                            {item.name}
                          </Link>
                          {item.category && (
                            <div className="text-ink-3 text-xs">
                              {item.category}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">
                          {item.stockBaseQty} {item.baseUnit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-ink-3 px-5 py-8 text-center text-sm">
                No inventory items are assigned to this supplier yet.
              </div>
            )}
          </Card>
        </div>

        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-3 text-[15px] font-bold">Details</h3>
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Lead time</span>
                <span className="font-semibold">
                  {supplier.leadTimeDays} days
                </span>
              </div>
            </div>
            <div className="text-ink-3 border-line-2 mt-4 border-t pt-3 text-xs">
              <div>
                Created {new Date(supplier.createdAt).toLocaleDateString()}
              </div>
              <div>
                Updated {new Date(supplier.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
