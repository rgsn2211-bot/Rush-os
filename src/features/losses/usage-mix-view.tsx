import Link from "next/link";
import type { UsageReport, ItemUsageLine } from "@/services/usage-report";
import { formatFils } from "@/lib/calculations/currency";
import { WASTE_ALERT_PCT } from "@/lib/calculations/usage-mix";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";

const RED = "var(--color-rush-red, #c0392b)";
const GREEN = "var(--color-rush-green, #1a7f4b)";
const NAVY = "var(--color-navy, #1f3a5f)";
const AMBER = "#d08700";

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/**
 * One row's consumption split as a single stacked bar: sold, used, wasted,
 * shrinkage. Plain divs — no chart library.
 */
function MixBar({ line }: { line: ItemUsageLine }) {
  const segments = [
    { key: "sold", value: line.mix.pct.sold, color: NAVY },
    { key: "used", value: line.mix.pct.used, color: GREEN },
    { key: "wasted", value: line.mix.pct.wasted, color: RED },
    { key: "shrinkage", value: line.mix.pct.shrinkage, color: AMBER },
  ].filter((s) => s.value > 0);

  return (
    <div className="bg-line-2 flex h-2 w-full overflow-hidden rounded-full">
      {segments.map((s) => (
        <div
          key={s.key}
          style={{ width: `${s.value}%`, backgroundColor: s.color }}
        />
      ))}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-ink-3 inline-flex items-center gap-1.5 text-xs">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function UsageMixView({
  report,
  period,
}: {
  report: UsageReport;
  period: { from: string; to: string };
}) {
  const { total } = report;

  return (
    <Card className="p-0">
      <div className="border-line-2 border-b px-5 py-4">
        <h2 className="text-base font-bold">Used vs Wasted</h2>
        <p className="text-ink-3 mt-0.5 text-xs">
          How everything that left the shelf was accounted for. Percentages are
          shares of consumption by value, so cheap and expensive items compare
          fairly. Stock found at a count is excluded — it was never consumed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
        <MetricCard
          label="Total consumed"
          value={`${formatFils(total.totalConsumedFils)} BHD`}
        />
        <MetricCard label="Sold" value={pct(total.pct.sold)} />
        <MetricCard label="Used internally" value={pct(total.pct.used)} />
        <MetricCard label="Wasted" value={pct(total.pct.wasted)} />
        <MetricCard
          label="Waste rate"
          value={pct(total.wasteRatePct)}
          accent={total.wasteRatePct > WASTE_ALERT_PCT ? RED : GREEN}
        />
      </div>

      <div className="border-line-2 flex flex-wrap gap-4 border-t px-5 py-3">
        <LegendDot color={NAVY} label="Sold" />
        <LegendDot color={GREEN} label="Used internally" />
        <LegendDot color={RED} label="Wasted" />
        <LegendDot color={AMBER} label="Shrinkage" />
      </div>

      {report.items.length === 0 ? (
        <div className="text-ink-3 px-5 py-8 text-center text-sm">
          Nothing was consumed in this period.
        </div>
      ) : (
        <div className="border-line-2 border-t">
          {report.items.map((line) => (
            <Link
              key={line.inventoryItemId}
              href={`/owner/losses/${line.inventoryItemId}?from=${period.from}&to=${period.to}`}
              className="border-line-2 hover:bg-bg block border-b px-5 py-3 last:border-b-0 transition-colors"
            >
              <div className="mb-2 flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {line.name}
                </span>
                {line.highWaste && <Badge variant="red">Over {WASTE_ALERT_PCT}%</Badge>}
                {line.mix.lowVolume && (
                  <span className="text-ink-3 text-xs">Low volume</span>
                )}
                <span className="text-ink-2 font-mono text-xs">
                  {formatFils(line.lostFils)} BHD lost
                </span>
                <span
                  className="w-16 text-right font-mono font-semibold"
                  style={{
                    color: line.highWaste ? RED : undefined,
                  }}
                >
                  {pct(line.mix.wasteRatePct)}
                </span>
              </div>
              <MixBar line={line} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
