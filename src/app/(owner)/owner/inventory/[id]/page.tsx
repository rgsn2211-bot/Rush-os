import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getItem } from "@/services/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { effectiveUnitCostFils } from "@/lib/calculations/costing";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function InventoryItemPage({
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
  const item = await getItem(db, id);
  if (!item) notFound();

  const unitCost = effectiveUnitCostFils(
    { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
    item.costingMethod,
    item.defaultCostFils,
  );

  return (
    <div>
      <Link
        href="/owner/inventory"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to inventory
      </Link>

      <PageHeader
        title={item.name}
        subtitle={
          item.category
            ? `${item.category} · ${item.stockUnit}`
            : item.stockUnit
        }
        actions={
          <Link href={`/owner/inventory/${item.id}/edit`}>
            <Button>Edit Item</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Stock overview */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Stock overview
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-ink-3 text-xs font-semibold uppercase">
                    On hand
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold">
                    {item.stockBaseQty} {item.baseUnit}
                  </div>
                </div>
                <div>
                  <div className="text-ink-3 text-xs font-semibold uppercase">
                    Unit cost
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold">
                    {unitCost > 0 ? `${formatFils(Math.round(unitCost))} BHD` : "—"}
                  </div>
                  <div className="text-ink-3 mt-0.5 text-xs">
                    per {item.baseUnit} ·{" "}
                    {item.costingMethod === "fixed" ? "fixed" : "weighted avg"}
                  </div>
                </div>
                <div>
                  <div className="text-ink-3 text-xs font-semibold uppercase">
                    Stock value
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold">
                    {item.stockValueFils > 0
                      ? `${formatFils(item.stockValueFils)} BHD`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div className="border-line-2 mt-4 border-t pt-3">
                {item.stockBaseQty <= item.minBaseQty && item.minBaseQty > 0 ? (
                  <Badge variant="red">Low stock</Badge>
                ) : item.maxBaseQty &&
                  item.stockBaseQty > item.maxBaseQty ? (
                  <Badge variant="blue">Overstocked</Badge>
                ) : (
                  <Badge variant="green">OK</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Units & conversion */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Units & conversion
              </h2>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-ink-2">Stock unit (storage)</span>
                  <span className="font-semibold">{item.stockUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Base unit (recipes)</span>
                  <span className="font-semibold">{item.baseUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Conversion</span>
                  <span className="font-mono font-semibold">
                    1 {item.stockUnit} = {item.basePerStock} {item.baseUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Purchase unit</span>
                  <span className="font-semibold">{item.purchaseUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Per purchase</span>
                  <span className="font-mono font-semibold">
                    {item.unitsPerPurchase} {item.stockUnit}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costing */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">Costing</h2>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-ink-2">Method</span>
                  <span className="font-semibold">
                    {item.costingMethod === "fixed"
                      ? "Fixed price"
                      : "Weighted average"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">
                    Default cost per {item.baseUnit}
                  </span>
                  <span className="font-mono font-semibold">
                    {item.defaultCostFils > 0
                      ? `${formatFils(item.defaultCostFils)} BHD`
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expiry & opening */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Expiry & shelf life
              </h2>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-ink-2">Expiry tracking</span>
                  <span className="font-semibold capitalize">
                    {item.expiry.replace("_", " ")}
                  </span>
                </div>
                {item.shelfLifeDays != null && (
                  <div className="flex justify-between">
                    <span className="text-ink-2">Default shelf life</span>
                    <span className="font-semibold">
                      {item.shelfLifeDays} days
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-2">Track after opening</span>
                  <span className="font-semibold">
                    {item.tracksOpen ? "Yes" : "No"}
                  </span>
                </div>
                {item.openLifeDays != null && (
                  <div className="flex justify-between">
                    <span className="text-ink-2">Use within</span>
                    <span className="font-semibold">
                      {item.openLifeDays} days after opening
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-3 text-[15px] font-bold">Reorder settings</h3>
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Min stock</span>
                <span className="font-mono font-semibold">
                  {item.minBaseQty} {item.baseUnit}
                </span>
              </div>
              {item.maxBaseQty != null && (
                <div className="flex justify-between">
                  <span className="text-ink-2">Max stock</span>
                  <span className="font-mono font-semibold">
                    {item.maxBaseQty} {item.baseUnit}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-ink-2">Safety days</span>
                <span className="font-semibold">{item.safetyDays}</span>
              </div>
            </div>

            {item.supplierId && (
              <div className="border-line-2 mt-4 border-t pt-3">
                <div className="text-ink-3 text-xs font-semibold uppercase">
                  Supplier
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {item.supplierId}
                </div>
              </div>
            )}

            <div className="border-line-2 mt-4 border-t pt-3 text-xs text-ink-3">
              <div>Created {new Date(item.createdAt).toLocaleDateString()}</div>
              <div>Updated {new Date(item.updatedAt).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
