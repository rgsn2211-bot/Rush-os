import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProductWithCost, buildCostBreakdown } from "@/services/products";
import { formatFils } from "@/lib/calculations/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ProductDetailPage({
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
  const product = await getProductWithCost(db, id);
  if (!product) notFound();

  const breakdown = await buildCostBreakdown(db, id);

  const marginVariant =
    product.marginPct >= 70
      ? "green"
      : product.marginPct >= 60
        ? "amber"
        : "red";

  return (
    <div>
      <Link
        href="/owner/products"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to products
      </Link>

      <PageHeader
        title={product.name}
        subtitle={product.category ?? undefined}
        actions={
          <Link href={`/owner/products/${product.id}/edit`}>
            <Button>Edit Product</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Recipe breakdown */}
          <Card className="p-0">
            <div className="border-line-2 border-b px-5 py-4">
              <h2 className="text-base font-bold">Recipe</h2>
            </div>

            {breakdown.ingredients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-line-2 border-b">
                      <th className="text-ink-3 px-5 py-2.5 text-left text-xs font-semibold uppercase">
                        Ingredient
                      </th>
                      <th className="text-ink-3 px-5 py-2.5 text-right text-xs font-semibold uppercase">
                        Qty
                      </th>
                      <th className="text-ink-3 px-5 py-2.5 text-left text-xs font-semibold uppercase">
                        Unit
                      </th>
                      <th className="text-ink-3 px-5 py-2.5 text-right text-xs font-semibold uppercase">
                        Line cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.ingredients.map((ing) => (
                      <tr
                        key={ing.item.id}
                        className="border-line-2 border-b"
                      >
                        <td className="px-5 py-3 font-semibold">
                          {ing.item.name}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">
                          {ing.qtyBase}
                        </td>
                        <td className="text-ink-3 px-5 py-3">
                          {ing.item.baseUnit}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-semibold">
                          {formatFils(ing.lineCostFils)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-ink-3 px-5 py-8 text-center text-sm">
                No recipe ingredients yet.
              </div>
            )}

            <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-4">
              <span className="text-[14.5px] font-bold">Total recipe cost</span>
              <span className="font-mono text-base font-bold">
                {formatFils(breakdown.totalCostFils)}{" "}
                <span className="text-ink-3 text-xs">BHD</span>
              </span>
            </div>
          </Card>
        </div>

        {/* Margin sidebar */}
        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-3.5 text-[15px] font-bold">Margin</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-ink-2 text-[13px]">Selling price</span>
                <span className="font-mono text-sm font-semibold">
                  {formatFils(product.priceFils)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2 text-[13px]">Recipe cost</span>
                <span className="text-ink-2 font-mono text-sm font-semibold">
                  {formatFils(product.costFils)}
                </span>
              </div>
              <div className="border-line-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-ink-2 text-[13px]">Gross margin</span>
                  <span className="font-mono text-sm font-semibold text-rush-green">
                    {formatFils(product.marginFils)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2 text-[13px]">Margin %</span>
                <Badge variant={marginVariant as "green" | "amber" | "red"}>
                  {Math.round(product.marginPct)}%
                </Badge>
              </div>
            </div>

            {product.posItemId && (
              <div className="border-line-2 mt-4 border-t pt-3">
                <div className="text-ink-3 text-xs font-semibold uppercase">
                  POS Item ID
                </div>
                <div className="mt-1 font-mono text-sm font-semibold">
                  {product.posItemId}
                </div>
              </div>
            )}

            <div className="text-ink-3 border-line-2 mt-4 border-t pt-3 text-xs">
              <div>
                Created {new Date(product.createdAt).toLocaleDateString()}
              </div>
              <div>
                Updated {new Date(product.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
