import Link from "next/link";
import type { InventoryInsights, InventoryItemInsight } from "@/services/inventory-insights";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const RED = "var(--color-rush-red, #c0392b)";

/** Base-unit quantity shown in the item's stock unit, lightly rounded. */
function inStockUnits(i: InventoryItemInsight, baseQty: number): string {
  const v = baseQty / (i.item.basePerStock || 1);
  return `${Math.round(v * 100) / 100} ${i.item.stockUnit}`;
}

function daysLabel(days: number | null): string {
  if (days === null) return "no usage";
  if (days <= 0) return "out now";
  if (days < 1) return "< 1 day";
  return `${Math.floor(days)} day${Math.floor(days) >= 2 ? "s" : ""}`;
}

const TH = "text-ink-3 px-4 py-2.5 text-left text-xs font-semibold uppercase";
const TD = "px-4 py-2.5 text-sm";

export function InsightsView({ insights }: { insights: InventoryInsights }) {
  const { reorderSoon, fastMovers } = insights;
  const negativeCount = insights.all.filter(
    (i) => i.item.stockBaseQty < 0,
  ).length;
  const maxCogs = fastMovers[0]?.cogs30Fils ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Reorder now"
          value={String(reorderSoon.length)}
          accent={reorderSoon.length > 0 ? RED : undefined}
        />
        <MetricCard
          label="Negative stock"
          value={String(negativeCount)}
          accent={negativeCount > 0 ? RED : undefined}
        />
        <MetricCard label="Items tracked" value={String(insights.all.length)} />
        <MetricCard
          label="30-day usage cost"
          value={`${formatFils(
            insights.all.reduce((s, i) => s + i.cogs30Fils, 0),
          )} BHD`}
        />
      </div>

      <Card className="p-0">
        <div className="border-line-2 border-b px-5 py-4">
          <h2 className="text-base font-bold">Reorder soon</h2>
          <p className="text-ink-3 mt-0.5 text-xs">
            Predicted from the last 7–30 days of usage vs supplier lead time and
            each item&apos;s safety buffer
          </p>
        </div>
        {reorderSoon.length === 0 ? (
          <EmptyState message="Nothing needs reordering right now." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-line-2 border-b">
                  <th className={TH}>Item</th>
                  <th className={`${TH} text-right`}>On hand</th>
                  <th className={`${TH} text-right`}>Daily use</th>
                  <th className={`${TH} text-right`}>Runs out</th>
                  <th className={`${TH} text-right`}>Suggested order</th>
                  <th className={TH}>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {reorderSoon.map((i) => (
                  <tr key={i.item.id} className="border-line-2 border-b last:border-b-0">
                    <td className={`${TD} font-semibold`}>
                      <Link
                        href={`/owner/inventory/${i.item.id}`}
                        className="hover:text-navy"
                      >
                        {i.item.name}
                      </Link>
                    </td>
                    <td
                      className={`${TD} text-right font-mono`}
                      style={i.item.stockBaseQty < 0 ? { color: RED } : undefined}
                    >
                      {inStockUnits(i, i.item.stockBaseQty)}
                    </td>
                    <td className={`${TD} text-ink-2 text-right font-mono`}>
                      {inStockUnits(i, i.ratePerDay7 > 0 ? i.ratePerDay7 : i.ratePerDay30)}
                    </td>
                    <td className={`${TD} text-right`}>
                      <Badge
                        variant={
                          i.daysToStockout !== null && i.daysToStockout <= 2
                            ? "red"
                            : "amber"
                        }
                      >
                        {daysLabel(i.daysToStockout)}
                        {i.stockoutDate && i.daysToStockout! > 0
                          ? ` · ${new Date(i.stockoutDate).toLocaleDateString()}`
                          : ""}
                      </Badge>
                    </td>
                    <td className={`${TD} text-right font-mono font-semibold`}>
                      {i.suggestedPurchaseUnits} {i.item.purchaseUnit}
                    </td>
                    <td className={`${TD} text-ink-2`}>
                      {i.supplierName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <div className="border-line-2 border-b px-5 py-4">
          <h2 className="text-base font-bold">Fast movers (last 30 days)</h2>
          <p className="text-ink-3 mt-0.5 text-xs">
            Ranked by usage cost — where your COGS money goes
          </p>
        </div>
        {fastMovers.length === 0 ? (
          <EmptyState message="No usage recorded in the last 30 days. Process a POS import first." />
        ) : (
          <div className="flex flex-col">
            {fastMovers.slice(0, 15).map((i) => (
              <div
                key={i.item.id}
                className="border-line-2 flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
              >
                <Link
                  href={`/owner/inventory/${i.item.id}`}
                  className="hover:text-navy min-w-0 flex-1 truncate text-sm font-semibold"
                >
                  {i.item.name}
                </Link>
                <span className="text-ink-3 hidden font-mono text-xs sm:block">
                  {inStockUnits(i, i.qty30)} / 30d
                </span>
                <div className="w-1/4">
                  <div className="bg-bg h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-navy h-full rounded-full"
                      style={{
                        width: `${maxCogs > 0 ? Math.max(2, Math.round((i.cogs30Fils / maxCogs) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {formatFils(i.cogs30Fils)} BHD
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
