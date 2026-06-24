"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecurringCost } from "@/types/money";
import { formatFils } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2 } from "lucide-react";

function within30Days(isoDate: string): boolean {
  const due = new Date(isoDate + "T00:00:00Z").getTime();
  const now = Date.now();
  return due <= now + 30 * 24 * 60 * 60 * 1000;
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

  const upcomingTotal = costs
    .filter((c) => within30Days(c.nextDueDate))
    .reduce((s, c) => s + c.amountFils, 0);

  async function pay(id: string) {
    setBusyId(id);
    await fetch(`/api/money/recurring/${id}/pay`, { method: "POST" });
    setBusyId(null);
    router.refresh();
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
          {costs.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i > 0 ? "border-line-2 border-t" : ""
              }`}
            >
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
                variant="secondary"
                onClick={() => pay(c.id)}
                disabled={busyId === c.id}
              >
                Mark Paid
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
          ))}
        </Card>
      )}

      <p className="text-ink-3 mt-3 text-xs leading-relaxed">
        Recurring costs are for planning. Marking one paid records an expense and
        advances the next due date.
      </p>
    </div>
  );
}
