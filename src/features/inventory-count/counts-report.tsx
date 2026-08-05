import Link from "next/link";
import type { CountReport, CountReportLine } from "@/services/count-report";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";

const GREEN = "var(--color-rush-green, #1a7f4b)";
const RED = "var(--color-rush-red, #c0392b)";

/** Value in fils, signed — a shortage is negative and shown red. */
function Money({ fils }: { fils: number }) {
  if (fils === 0) return <span className="text-ink-3 font-mono">0.000</span>;
  return (
    <span
      className="font-mono font-semibold"
      style={{ color: fils < 0 ? RED : GREEN }}
    >
      {fils > 0 ? "+" : "−"}
      {formatFils(Math.abs(fils))}
    </span>
  );
}

function toStock(baseQty: number, basePerStock: number): number {
  return Math.round((baseQty / (basePerStock || 1)) * 1000) / 1000;
}

function VarianceQty({ line }: { line: CountReportLine }) {
  const v = toStock(line.varianceBaseQty, line.basePerStock);
  return (
    <span
      className="font-mono font-semibold"
      style={{ color: v < 0 ? RED : GREEN }}
    >
      {v > 0 ? "+" : "−"}
      {Math.abs(v)} {line.stockUnit}
    </span>
  );
}

export function CountsReport({ report }: { report: CountReport }) {
  const shortages = report.repeatOffenders.filter((o) => o.valueFils < 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard label="Counts" value={String(report.sessions.length)} />
        <MetricCard
          label="Net variance"
          value={`${report.totalNetValueFils < 0 ? "−" : ""}${formatFils(
            Math.abs(report.totalNetValueFils),
          )} BHD`}
          accent={report.totalNetValueFils < 0 ? RED : GREEN}
        />
        <MetricCard
          label="Items with a shortage"
          value={String(shortages.length)}
        />
      </div>

      <Card className="p-0">
        <div className="border-line-2 border-b px-5 py-4">
          <h2 className="text-base font-bold">Repeat offenders</h2>
          <p className="text-ink-3 mt-0.5 text-xs">
            Each item&apos;s variance added up across every count in this
            period. An item short again and again is worth investigating.
          </p>
        </div>
        {report.repeatOffenders.length === 0 ? (
          <div className="text-ink-3 px-5 py-8 text-center text-sm">
            No variances found in this period.
          </div>
        ) : (
          report.repeatOffenders.map((o, i) => (
            <div
              key={o.inventoryItemId}
              className={`flex items-center gap-3 px-5 py-3 text-sm ${
                i > 0 ? "border-line-2 border-t" : ""
              }`}
            >
              <span className="min-w-0 flex-1 truncate font-semibold">
                {o.name}
              </span>
              <span className="text-ink-3 text-xs">
                {o.countsWithVariance} count
                {o.countsWithVariance === 1 ? "" : "s"}
              </span>
              <span className="text-ink-2 font-mono text-xs">
                {toStock(o.varianceBaseQty, o.basePerStock)} {o.stockUnit}
              </span>
              <Money fils={o.valueFils} />
            </div>
          ))
        )}
      </Card>

      {report.sessions.length === 0 ? (
        <Card>
          <p className="text-ink-3 py-6 text-center text-sm">
            No counts fall in this period. Counts are filed by the date their
            losses apply to, not the day they were approved.
          </p>
        </Card>
      ) : (
        report.sessions.map((session) => (
          <Card key={session.id} className="p-0">
            <div className="border-line-2 flex items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 className="text-base font-bold">
                  {session.effectiveOn ??
                    new Date(session.countedAt).toLocaleDateString()}
                </h2>
                <p className="text-ink-3 mt-0.5 text-xs">
                  {session.itemCount} item
                  {session.itemCount === 1 ? "" : "s"} counted ·{" "}
                  {session.lines.length} with a difference
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Money fils={session.netValueFils} />
                {session.status === "needs_review" ? (
                  <Badge variant="amber">Pending</Badge>
                ) : (
                  <Badge variant="green">Approved</Badge>
                )}
                <Link
                  href={`/owner/inventory-count/${session.id}`}
                  className="text-navy text-xs font-semibold hover:underline"
                >
                  Open →
                </Link>
              </div>
            </div>

            {session.lines.length === 0 ? (
              <div className="text-ink-3 px-5 py-6 text-center text-sm">
                Everything matched.
              </div>
            ) : (
              <>
                <div className="text-ink-3 grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] gap-2 border-b border-line-2 px-5 py-2.5 text-[11px] font-bold tracking-wider uppercase">
                  <div>Item</div>
                  <div className="text-right">Expected</div>
                  <div className="text-right">Counted</div>
                  <div className="text-right">Difference</div>
                  <div className="text-right">Value (BHD)</div>
                </div>
                {session.lines.map((line, i) => (
                  <div
                    key={line.inventoryItemId}
                    className={`grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] items-center gap-2 px-5 py-3 text-sm ${
                      i > 0 ? "border-line-2 border-t" : ""
                    } ${line.excluded ? "opacity-50" : ""}`}
                  >
                    <div className="min-w-0 truncate font-semibold">
                      {line.name}
                      {line.excluded && (
                        <span className="text-ink-3 ml-1.5 text-[11px] font-normal">
                          · excluded
                          {line.excludedKeptStock ? " (stock kept)" : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-ink-2 text-right font-mono">
                      {toStock(line.expectedBaseQty, line.basePerStock)}
                    </div>
                    <div className="text-right font-mono">
                      {toStock(line.countedBaseQty, line.basePerStock)}
                    </div>
                    <div className="text-right">
                      <VarianceQty line={line} />
                    </div>
                    <div className="text-right">
                      <Money fils={line.valueFils} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
