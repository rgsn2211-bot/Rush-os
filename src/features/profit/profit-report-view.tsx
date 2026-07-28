import type { ProfitReport } from "@/types/reports";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";

const GREEN = "var(--color-rush-green, #1a7f4b)";
const RED = "var(--color-rush-red, #c0392b)";

function money(fils: number): string {
  return formatFils(fils);
}

function signed(fils: number): string {
  return `${fils < 0 ? "−" : ""}${formatFils(Math.abs(fils))}`;
}

/** A simple CSS bar scaled against the largest value in its table. */
function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((Math.abs(value) / max) * 100)) : 0;
  return (
    <div className="bg-bg h-1.5 w-full overflow-hidden rounded-full">
      <div
        className="bg-navy h-full rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-0">
      <div className="border-line-2 border-b px-5 py-4">
        <h2 className="text-base font-bold">{title}</h2>
        {subtitle && <p className="text-ink-3 mt-0.5 text-xs">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

const TH = "text-ink-3 px-4 py-2.5 text-xs font-semibold uppercase";
const TD = "px-4 py-2.5 text-sm";

export function ProfitReportView({ report }: { report: ProfitReport }) {
  const { revenue, cogs, losses, fees, otherPl, summary } = report;
  const net = summary.netProfitFils;

  return (
    <div className="flex flex-col gap-5">
      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Revenue" value={`${money(summary.grossSalesFils)} BHD`} />
        <MetricCard label="COGS" value={`${money(summary.cogsFils)} BHD`} />
        <MetricCard
          label="Gross profit"
          value={`${signed(summary.grossProfitFils)} BHD`}
          accent={summary.grossProfitFils >= 0 ? GREEN : RED}
        />
        <MetricCard
          label="Net profit"
          value={`${signed(net)} BHD`}
          accent={net >= 0 ? GREEN : RED}
        />
      </div>

      {/* P&L rollup */}
      <SectionCard
        title="Profit & Loss"
        subtitle={`${report.fromInclusive} → ${report.toInclusive} · revenue from ${revenue.closingsCount} approved daily closing${revenue.closingsCount === 1 ? "" : "s"} of ${revenue.daysInPeriod} day${revenue.daysInPeriod === 1 ? "" : "s"}`}
      >
        <div className="flex flex-col text-sm">
          {[
            { label: "Gross sales", fils: summary.grossSalesFils, sign: 1 },
            { label: "Cost of goods sold", fils: summary.cogsFils, sign: -1 },
            { label: "Gross profit", fils: summary.grossProfitFils, bold: true },
            { label: "Expenses", fils: summary.expensesFils, sign: -1 },
            { label: "Commission & fees", fils: summary.feesFils, sign: -1 },
            { label: "Waste & count losses", fils: summary.lossesFils, sign: -1 },
            ...(otherPl.netFils !== 0
              ? [{ label: "Other P&L movements (adjustments)", fils: otherPl.netFils }]
              : []),
            { label: "Net profit", fils: net, bold: true },
          ].map((row) => (
            <div
              key={row.label}
              className={`border-line-2 flex items-center justify-between border-b px-5 py-3 last:border-b-0 ${
                row.bold ? "bg-bg font-bold" : ""
              }`}
            >
              <span className={row.bold ? "" : "text-ink-2"}>{row.label}</span>
              <span
                className="font-mono font-semibold"
                style={
                  row.bold ? { color: row.fils >= 0 ? GREEN : RED } : undefined
                }
              >
                {row.sign === -1 && row.fils !== 0 ? "− " : ""}
                {row.sign === -1 ? money(row.fils) : signed(row.fils)} BHD
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Revenue breakdown */}
      <SectionCard
        title="Revenue"
        subtitle="From approved Daily Closings — the official revenue record"
      >
        {revenue.closingsCount === 0 ? (
          <div className="text-ink-3 px-5 py-8 text-center text-sm">
            No approved daily closings in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-line-2 border-b text-left">
                  <th className={TH}>Method</th>
                  <th className={`${TH} text-right`}>Orders</th>
                  <th className={`${TH} text-right`}>Sales</th>
                  <th className={`${TH} w-1/3`}></th>
                </tr>
              </thead>
              <tbody>
                {revenue.methods.map((m) => (
                  <tr key={m.key} className="border-line-2 border-b last:border-b-0">
                    <td className={`${TD} font-semibold`}>{m.label}</td>
                    <td className={`${TD} text-right font-mono`}>{m.orders}</td>
                    <td className={`${TD} text-right font-mono font-semibold`}>
                      {money(m.salesFils)}
                    </td>
                    <td className={TD}>
                      <Bar
                        value={m.salesFils}
                        max={Math.max(...revenue.methods.map((x) => x.salesFils))}
                      />
                    </td>
                  </tr>
                ))}
                {revenue.deliveryPlatforms.map((p) => (
                  <tr key={p.platformId} className="border-line-2 border-b last:border-b-0">
                    <td className={`${TD} text-ink-2 pl-8`}>{p.name}</td>
                    <td className={`${TD} text-ink-2 text-right font-mono`}>{p.orders}</td>
                    <td className={`${TD} text-ink-2 text-right font-mono`}>
                      {money(p.salesFils)}
                    </td>
                    <td className={TD}></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-bg border-line-2 flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
              <span className="text-ink-2">
                {revenue.totalOrders} orders · discounts {money(revenue.discountFils)} BHD
                {revenue.cashVarianceFils !== 0 &&
                  ` · cash variance ${signed(revenue.cashVarianceFils)} BHD`}
              </span>
              <span className="font-mono font-bold">
                {money(revenue.grossSalesFils)} BHD
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* COGS by group */}
      <SectionCard
        title="COGS by group"
        subtitle="What each product group (menu, staff drinks, training, ...) consumed"
      >
        {cogs.byGroup.length === 0 ? (
          <div className="text-ink-3 px-5 py-8 text-center text-sm">
            No processed POS imports in this period.
          </div>
        ) : (
          <div className="flex flex-col">
            {cogs.byGroup.map((g) => (
              <div
                key={g.name}
                className="border-line-2 flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {g.name}
                </span>
                <div className="w-1/3">
                  <Bar
                    value={g.cogsFils}
                    max={Math.max(...cogs.byGroup.map((x) => Math.abs(x.cogsFils)))}
                  />
                </div>
                <span className="font-mono text-sm font-semibold">
                  {money(g.cogsFils)} BHD
                </span>
              </div>
            ))}
            <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-3 text-sm font-bold">
              <span>Total COGS</span>
              <span className="font-mono">{money(cogs.totalFils)} BHD</span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* COGS by product */}
      <SectionCard
        title="COGS by product"
        subtitle="Cost, sales and margin per product for the period"
      >
        {cogs.byProduct.length === 0 ? (
          <div className="text-ink-3 px-5 py-8 text-center text-sm">
            Per-product cost tracking starts with the first POS import processed
            after this update.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-line-2 border-b text-left">
                  <th className={TH}>Product</th>
                  <th className={TH}>Group</th>
                  <th className={`${TH} text-right`}>Sold</th>
                  <th className={`${TH} text-right`}>Sales</th>
                  <th className={`${TH} text-right`}>Cost</th>
                  <th className={`${TH} text-right`}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {cogs.byProduct.map((p) => {
                  const marginFils = p.salesFils - p.cogsFils;
                  return (
                    <tr key={p.productId} className="border-line-2 border-b last:border-b-0">
                      <td className={`${TD} font-semibold`}>{p.name}</td>
                      <td className={`${TD} text-ink-2`}>{p.groupName}</td>
                      <td className={`${TD} text-right font-mono`}>{p.unitsSold}</td>
                      <td className={`${TD} text-right font-mono`}>{money(p.salesFils)}</td>
                      <td className={`${TD} text-right font-mono`}>{money(p.cogsFils)}</td>
                      <td
                        className={`${TD} text-right font-mono font-semibold`}
                        style={{ color: marginFils >= 0 ? GREEN : RED }}
                      >
                        {signed(marginFils)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {cogs.unattributedFils > 0 && (
              <div className="text-ink-3 border-line-2 border-t px-5 py-3 text-xs">
                + {money(cogs.unattributedFils)} BHD from before per-product
                tracking (counted in the total, not attributable to a product).
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* COGS by inventory item */}
      <SectionCard title="Usage by inventory item" subtitle="What was consumed, and its cost">
        {cogs.byItem.length === 0 ? (
          <div className="text-ink-3 px-5 py-8 text-center text-sm">
            No POS usage in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-line-2 border-b text-left">
                  <th className={TH}>Item</th>
                  <th className={`${TH} text-right`}>Used</th>
                  <th className={`${TH} text-right`}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {cogs.byItem.map((i) => (
                  <tr key={i.inventoryItemId} className="border-line-2 border-b last:border-b-0">
                    <td className={`${TD} font-semibold`}>{i.name}</td>
                    <td className={`${TD} text-right font-mono`}>
                      {Math.round(i.qtyBase * 100) / 100} {i.baseUnit}
                    </td>
                    <td className={`${TD} text-right font-mono font-semibold`}>
                      {money(i.cogsFils)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Complimentary */}
      <SectionCard
        title="Complimentary"
        subtitle="Already counted inside POS COGS — shown here so you can see what giveaways cost"
      >
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <MetricCard label="Items given" value={String(cogs.complimentaryCount)} />
          <MetricCard
            label="Cost of goods given"
            value={`${money(cogs.complimentaryCostFils)} BHD`}
          />
          <MetricCard
            label="Menu value given away"
            value={`${money(cogs.complimentaryValueFils)} BHD`}
          />
        </div>
      </SectionCard>

      {/* Expenses + fees + losses */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Expenses by category">
          {report.expensesByCategory.length === 0 ? (
            <EmptyStateInline text="No expenses recorded in this period." />
          ) : (
            <div className="flex flex-col">
              {report.expensesByCategory.map((e) => (
                <div
                  key={e.category}
                  className="border-line-2 flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {e.category}
                  </span>
                  <div className="w-1/3">
                    <Bar
                      value={e.amountFils}
                      max={Math.max(
                        ...report.expensesByCategory.map((x) => x.amountFils),
                      )}
                    />
                  </div>
                  <span className="font-mono text-sm font-semibold">
                    {money(e.amountFils)}
                  </span>
                </div>
              ))}
              <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-3 text-sm font-bold">
                <span>Total expenses</span>
                <span className="font-mono">{money(report.expensesTotalFils)} BHD</span>
              </div>
            </div>
          )}
        </SectionCard>

        <div className="flex flex-col gap-5">
          <SectionCard title="Commission & fees">
            <div className="flex flex-col text-sm">
              <div className="border-line-2 flex items-center justify-between border-b px-5 py-3">
                <span className="text-ink-2">
                  Delivery commission (your configured rates)
                </span>
                <span className="font-mono font-semibold">
                  {money(fees.deliveryCommissionFils)} BHD
                </span>
              </div>
              <div className="border-line-2 flex items-center justify-between border-b px-5 py-3">
                <span className="text-ink-2">
                  Recorded card / BenefitPay fees
                </span>
                <span className="font-mono font-semibold">
                  {money(fees.recordedFeesFils)} BHD
                </span>
              </div>
              <div className="bg-bg flex items-center justify-between px-5 py-3 font-bold">
                <span>Total fees</span>
                <span className="font-mono">{money(fees.totalFils)} BHD</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Waste & count losses">
            <div className="flex flex-col text-sm">
              <div className="border-line-2 flex items-center justify-between border-b px-5 py-3">
                <span className="text-ink-2">Waste</span>
                <span className="font-mono font-semibold">{money(losses.wasteFils)} BHD</span>
              </div>
              <div className="border-line-2 flex items-center justify-between border-b px-5 py-3">
                <span className="text-ink-2">Count variance (shrinkage)</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: losses.countShrinkFils > 0 ? RED : GREEN }}
                >
                  {signed(losses.countShrinkFils)} BHD
                </span>
              </div>
              <div className="bg-bg flex items-center justify-between px-5 py-3 font-bold">
                <span>Total losses</span>
                <span className="font-mono">{signed(losses.totalFils)} BHD</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function EmptyStateInline({ text }: { text: string }) {
  return <div className="text-ink-3 px-5 py-8 text-center text-sm">{text}</div>;
}
