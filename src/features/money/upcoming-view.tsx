"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecurringCost } from "@/types/money";
import { formatFils } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2 } from "lucide-react";

function within30Days(isoDate: string): boolean {
  const due = new Date(isoDate + "T00:00:00Z").getTime();
  const now = Date.now();
  return due <= now + 30 * 24 * 60 * 60 * 1000;
}

/** Advance an ISO date by N steps of a frequency (client-side preview only). */
function advance(
  isoDate: string,
  frequency: RecurringCost["frequency"],
  steps: number,
): string {
  const d = new Date(isoDate + "T00:00:00Z");
  if (frequency === "Weekly") d.setUTCDate(d.getUTCDate() + 7 * steps);
  else if (frequency === "Monthly") d.setUTCMonth(d.getUTCMonth() + steps);
  return d.toISOString().split("T")[0];
}

export function UpcomingView({
  costs,
  onNew,
}: {
  costs: RecurringCost[];
  onNew: () => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [periods, setPeriods] = useState(1);

  const upcomingTotal = costs
    .filter((c) => within30Days(c.nextDueDate))
    .reduce((s, c) => s + c.amountFils, 0);

  async function pay(id: string, count: number) {
    setBusyId(id);
    await fetch(`/api/money/recurring/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periods: count }),
    });
    setBusyId(null);
    setSelectingId(null);
    setPeriods(1);
    router.refresh();
  }

  function onMarkPaid(c: RecurringCost) {
    // Only Weekly/Monthly can cover several periods; others pay one.
    if (c.frequency === "Weekly" || c.frequency === "Monthly") {
      setPeriods(1);
      setSelectingId(selectingId === c.id ? null : c.id);
    } else {
      pay(c.id, 1);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    await fetch(`/api/money/recurring/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Card className="inline-flex">
          <CardContent className="px-4 py-3">
            <div className="text-ink-3 text-xs font-semibold">
              Total upcoming (30 days)
            </div>
            <div className="text-ink mt-1 font-mono text-xl font-bold">
              {formatFils(upcomingTotal)}{" "}
              <span className="text-ink-3 text-xs">BHD</span>
            </div>
          </CardContent>
        </Card>
        <Button onClick={onNew}>
          <Plus size={16} className="mr-1.5" />
          Add Recurring Cost
        </Button>
      </div>

      {costs.length === 0 ? (
        <EmptyState message="No recurring costs yet. Add rent, salaries or subscriptions to plan cash." />
      ) : (
        <Card className="p-0">
          {costs.map((c, i) => {
            const selecting = selectingId === c.id;
            const safePeriods = Math.max(1, Math.floor(periods) || 1);
            const coversThrough = advance(
              c.nextDueDate,
              c.frequency,
              safePeriods - 1,
            );
            return (
              <div
                key={c.id}
                className={i > 0 ? "border-line-2 border-t" : ""}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold">{c.name}</span>
                      <Badge variant="default">{c.costType}</Badge>
                    </div>
                    <div className="text-ink-3 mt-0.5 text-[13px]">
                      {c.frequency} · due {c.nextDueDate}
                    </div>
                  </div>
                  <div className="text-ink w-28 text-right font-mono text-sm font-bold">
                    {formatFils(c.amountFils)}
                  </div>
                  <Button
                    size="sm"
                    variant={selecting ? "primary" : "secondary"}
                    onClick={() => onMarkPaid(c)}
                    disabled={busyId === c.id}
                  >
                    {busyId === c.id ? "Paying..." : "Mark Paid"}
                  </Button>
                  <button
                    onClick={() => remove(c.id)}
                    disabled={busyId === c.id}
                    className="text-ink-3 hover:text-rush-red"
                    aria-label="Delete recurring cost"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {selecting && (
                  <div className="bg-bg border-line-2 border-t px-5 py-4">
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="text-ink-3 mb-1 block text-xs font-semibold">
                          Periods to pay in advance
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={periods}
                          onChange={(e) =>
                            setPeriods(Number(e.target.value) || 1)
                          }
                          className="w-24 font-mono"
                        />
                      </div>
                      <div className="text-[13px] leading-relaxed">
                        <div className="text-ink-2">
                          Covers {safePeriods}{" "}
                          {c.frequency === "Weekly" ? "week" : "month"}
                          {safePeriods !== 1 ? "s" : ""} through{" "}
                          <span className="font-semibold">{coversThrough}</span>
                        </div>
                        <div className="text-ink font-mono font-bold">
                          {formatFils(c.amountFils * safePeriods)} BHD total
                        </div>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => pay(c.id, safePeriods)}
                          disabled={busyId === c.id}
                        >
                          Pay {safePeriods > 1 ? `${safePeriods} periods` : "now"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectingId(null)}
                          disabled={busyId === c.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                    <p className="text-ink-3 mt-2 text-xs">
                      The full amount leaves your account today; each period is
                      booked on its own due date.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <p className="text-ink-3 mt-3 text-xs leading-relaxed">
        Recurring costs are for planning. Marking one paid records an expense and
        advances the next due date. Rent/salaries can be paid several periods
        ahead at once.
      </p>
    </div>
  );
}
