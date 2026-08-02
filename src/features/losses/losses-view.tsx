import Link from "next/link";
import type { LossesReport, LossItemLine } from "@/services/losses";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";

const GREEN = "var(--color-rush-green, #1a7f4b)";
const RED = "var(--color-rush-red, #c0392b)";

function signed(fils: number): string {
  return `${fils < 0 ? "−" : ""}${formatFils(Math.abs(fils))}`;
}

function ItemTable({
  title,
  subtitle,
  totalFils,
  lines,
  emptyText,
  period,
}: {
  title: string;
  subtitle: string;
  totalFils: number;
  lines: LossItemLine[];
  emptyText: string;
  period: { from: string; to: string };
}) {
  return (
    <Card className="p-0">
      <div className="border-line-2 border-b px-5 py-4">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-ink-3 mt-0.5 text-xs">{subtitle}</p>
      </div>
      {lines.length === 0 ? (
        <div className="text-ink-3 px-5 py-8 text-center text-sm">{emptyText}</div>
      ) : (
        <div className="flex flex-col">
          {lines.map((l) => (
            <Link
              key={l.inventoryItemId}
              href={`/owner/losses/${l.inventoryItemId}?from=${period.from}&to=${period.to}`}
              className="border-line-2 hover:bg-bg flex items-center gap-3 border-b px-5 py-3 last:border-b-0 text-sm transition-colors"
            >
              <span className="min-w-0 flex-1 truncate font-semibold">{l.name}</span>
              <span className="text-ink-2 font-mono text-xs">
                {Math.round(l.qtyBase * 100) / 100} {l.baseUnit}
              </span>
              <span
                className="font-mono font-semibold"
                style={{ color: l.valueFils > 0 ? RED : GREEN }}
              >
                {signed(l.valueFils)} BHD
              </span>
            </Link>
          ))}
          <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-3 text-sm font-bold">
            <span>Total</span>
            <span className="font-mono" style={{ color: totalFils > 0 ? RED : GREEN }}>
              {signed(totalFils)} BHD
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

export function LossesView({ report }: { report: LossesReport }) {
  const period = { from: report.fromInclusive, to: report.toInclusive };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total losses"
          value={`${signed(report.totalLossFils)} BHD`}
          accent={report.totalLossFils > 0 ? RED : GREEN}
        />
        <MetricCard label="Waste" value={`${formatFils(report.wasteFils)} BHD`} />
        <MetricCard
          label="Count variance"
          value={`${signed(report.countShrinkFils)} BHD`}
          accent={report.countShrinkFils > 0 ? RED : GREEN}
        />
        <MetricCard
          label="Balance shortages"
          value={`${formatFils(report.adjustmentLossFils)} BHD`}
          accent={report.adjustmentLossFils > 0 ? RED : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ItemTable
          title="Waste by item"
          subtitle="Approved waste in the period"
          totalFils={report.wasteFils}
          lines={report.wasteByItem}
          emptyText="No approved waste in this period."
          period={period}
        />
        <ItemTable
          title="Count variance by item"
          subtitle="Shrinkage found by approved counts (negative = overage found)"
          totalFils={report.countShrinkFils}
          lines={report.countByItem}
          emptyText="No count variances in this period."
          period={period}
        />
      </div>

      <ItemTable
        title="Operational usage (adjusted out of losses)"
        subtitle="Waste or shrinkage you marked as ordinary use or an unrecorded sale — still inside COGS, no longer counted as a loss"
        totalFils={report.operationalUsageFils}
        lines={report.operationalByItem}
        emptyText="Nothing has been adjusted out of losses in this period."
        period={period}
      />

      <Card className="p-0">
        <div className="border-line-2 border-b px-5 py-4">
          <h2 className="text-base font-bold">Complimentary given away</h2>
          <p className="text-ink-3 mt-0.5 text-xs">
            Already counted inside POS COGS — shown here for visibility, not
            added to the loss total.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <MetricCard label="Items" value={String(report.compCount)} />
          <MetricCard label="Cost of goods" value={`${formatFils(report.compCostFils)} BHD`} />
          <MetricCard label="Menu value" value={`${formatFils(report.compValueFils)} BHD`} />
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-line-2 flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Balance adjustments</h2>
            <p className="text-ink-3 mt-0.5 text-xs">
              Differences found when checking the register/bank against the books
            </p>
          </div>
          <Link
            href="/owner/money/adjust"
            className="text-navy text-xs font-semibold hover:underline"
          >
            Open Adjust Balances →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <MetricCard label="Checks" value={String(report.adjustmentCount)} />
          <MetricCard
            label="Shortages (losses)"
            value={`${formatFils(report.adjustmentLossFils)} BHD`}
            accent={report.adjustmentLossFils > 0 ? RED : undefined}
          />
          <MetricCard
            label="Overages (gains)"
            value={`${formatFils(report.adjustmentGainFils)} BHD`}
            accent={report.adjustmentGainFils > 0 ? GREEN : undefined}
          />
        </div>
      </Card>
    </div>
  );
}
