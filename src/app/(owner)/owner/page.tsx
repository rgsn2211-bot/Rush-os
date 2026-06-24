import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllItems } from "@/services/inventory";
import { getAllProductsWithCosts } from "@/services/products";
import { getPendingPurchases } from "@/services/purchases";
import { getPendingComplimentary } from "@/services/complimentary";
import { getPendingWaste } from "@/services/waste";
import { getPendingClosings } from "@/services/daily-closing";
import { formatFils } from "@/lib/calculations/currency";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function OwnerDashboard() {
  const db = await createClient();
  await requireOwner(db);

  const [
    items,
    products,
    pendingPurchases,
    pendingComp,
    pendingWaste,
    pendingClosings,
  ] = await Promise.all([
    getAllItems(db),
    getAllProductsWithCosts(db),
    getPendingPurchases(db),
    getPendingComplimentary(db),
    getPendingWaste(db),
    getPendingClosings(db),
  ]);

  const pendingCount =
    pendingPurchases.length +
    pendingComp.length +
    pendingWaste.length +
    pendingClosings.length;

  const totalValueFils = items.reduce((sum, i) => sum + i.stockValueFils, 0);
  const lowStock = items.filter(
    (i) => i.minBaseQty > 0 && i.stockBaseQty <= i.minBaseQty,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Operations at a glance"
        actions={
          <Link href="/owner/purchases/new">
            <Button>Receive Stock</Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Inventory value"
          value={`${formatFils(totalValueFils)} BHD`}
        />
        <MetricCard
          label="Low stock items"
          value={String(lowStock.length)}
          accent={lowStock.length > 0 ? "var(--color-rush-red)" : undefined}
        />
        <Link href="/owner/review">
          <MetricCard
            label="Pending reviews"
            value={String(pendingCount)}
            accent={pendingCount > 0 ? "var(--color-amber-500)" : undefined}
          />
        </Link>
        <MetricCard label="Products" value={String(products.length)} />
      </div>

      <h2 className="text-ink mb-3 text-base font-bold">Low stock</h2>
      {lowStock.length === 0 ? (
        <EmptyState message="Nothing is low on stock right now." />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line-2 border-b">
                  <th className="text-ink-3 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Item
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    On hand
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Minimum
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id} className="border-line-2 border-b last:border-b-0">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/owner/inventory/${item.id}`}
                        className="hover:text-navy font-semibold"
                      >
                        {item.name}
                      </Link>
                      {item.category && (
                        <div className="text-ink-3 text-xs">{item.category}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      {item.stockBaseQty} {item.baseUnit}
                    </td>
                    <td className="text-ink-2 px-5 py-3.5 text-right font-mono">
                      {item.minBaseQty} {item.baseUnit}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="red">Low</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
