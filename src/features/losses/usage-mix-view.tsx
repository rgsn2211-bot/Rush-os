import Link from "next/link";
import type { UsageReport, ItemUsageLine } from "@/services/usage-report";
import { formatFils } from "@/lib/calculations/currency";
import {
  WASTE_ALERT_PCT,
  type UsageMix,
} from "@/lib/calculations/usage-mix";
import { Card } from "@/components/ui/card";

const RED = "var(--color-rush-red, #c0392b)";
const GREEN = "var(--color-rush-green, #1a7f4b)";
const NAVY = "var(--color-navy, #1f3a5f)";
const AMBER = "#d08700";

/** How many items to show before the rest go behind "Show all". */
const VISIBLE_ITEMS = 8;

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** The four consumption classes in display order, with their colours. */
function segmentsOf(mix: UsageMix) {
  return [
    { key: "sold", label: "Sold", value: mix.pct.sold, color: NAVY },
    { key: "used", label: "Used", value: mix.pct.used, color: GREEN },
    { key: "wasted", label: "Wasted", value: mix.pct.wasted, color: RED },
    {
      key: "shrinkage",
      label: "Shrinkage",
      value: mix.pct.shrinkage,
      color: AMBER,
    },
  ];
}

/** One consumption split as a stacked bar. Plain divs — no chart library. */
function MixBar({ mix, className }: { mix: UsageMix; className: string }) {
  return (
    <div
      className={`bg-line-2 flex overflow-hidden rounded-full ${className}`}
    >
      {segmentsOf(mix)
        .filter((s) => s.value > 0)
        .map((s) => (
          <div
            key={s.key}
            style={{ width: `${s.value}%`, backgroundColor: s.color }}
          />
        ))}
    </div>
  );
}

function ItemRow({
  line,
  period,
}: {
  line: ItemUsageLine;
  period: { from: string; to: string };
}) {
  return (
    <Link
      href={`/owner/losses/${line.inventoryItemId}?from=${period.from}&to=${period.to}`}
      className="border-line-2 hover:bg-bg flex items-center gap-3 border-b px-5 py-2 text-[13px] last:border-b-0 transition-colors"
    >
      <span className="min-w-0 flex-1 truncate font-semibold">
        {line.name}
        {line.mix.lowVolume && (
          <span className="text-ink-3 ml-1.5 text-[11px] font-normal">
            low volume
          </span>
        )}
      </span>
      <MixBar mix={line.mix} className="hidden h-1.5 w-24 sm:flex" />
      <span className="text-ink-3 w-24 text-right font-mono text-[11px]">
        {formatFils(line.lostFils)} lost
      </span>
      <span
        className="w-14 text-right font-mono font-semibold"
        style={line.highWaste ? { color: RED } : undefined}
      >
        {pct(line.mix.wasteRatePct)}
      </span>
    </Link>
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
  const overThreshold = total.wasteRatePct > WASTE_ALERT_PCT;

  const visible = report.items.slice(0, VISIBLE_ITEMS);
  const hidden = report.items.slice(VISIBLE_ITEMS);

  return (
    <Card className="p-0">
      <div className="border-line-2 border-b px-5 py-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">Used vs Wasted</h2>
          <span className="text-[13px]">
            <span className="text-ink-3">waste rate </span>
            <span
              className="font-mono font-bold"
              style={{ color: overThreshold ? RED : GREEN }}
            >
              {pct(total.wasteRatePct)}
            </span>
          </span>
        </div>
        <p className="text-ink-3 mt-0.5 text-xs">
          Share of what left the shelf, by value. Stock found at a count is
          excluded — it was never consumed.
        </p>
      </div>

      {total.totalConsumedFils === 0 ? (
        <div className="text-ink-3 px-5 py-8 text-center text-sm">
          Nothing was consumed in this period.
        </div>
      ) : (
        <>
          {/* Shop-wide summary: one bar, with the percentages doubling as its legend. */}
          <div className="border-line-2 border-b px-5 py-3.5">
            <MixBar mix={total} className="h-2.5 w-full" />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {segmentsOf(total).map((s) => (
                <span
                  key={s.key}
                  className="text-ink-2 inline-flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                  <span className="font-mono font-semibold">
                    {pct(s.value)}
                  </span>
                </span>
              ))}
              <span className="text-ink-3 ml-auto font-mono text-xs">
                {formatFils(total.totalConsumedFils)} BHD consumed
              </span>
            </div>
          </div>

          {visible.map((line) => (
            <ItemRow
              key={line.inventoryItemId}
              line={line}
              period={period}
            />
          ))}

          {hidden.length > 0 && (
            <details className="border-line-2 border-t">
              <summary className="text-navy hover:bg-bg cursor-pointer px-5 py-2.5 text-xs font-semibold">
                Show all {report.items.length} items
              </summary>
              {hidden.map((line) => (
                <ItemRow
                  key={line.inventoryItemId}
                  line={line}
                  period={period}
                />
              ))}
            </details>
          )}
        </>
      )}
    </Card>
  );
}
