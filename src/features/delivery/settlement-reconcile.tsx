"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settlement } from "@/types/money";
import { formatFils, bhdToFils } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Multi-select reconciliation: pick the pending settlements covered by a payout,
 * enter the total actually received, and the app derives the commission/fees and
 * posts the money to the bank.
 */
export function SettlementReconcile({
  settlements,
}: {
  settlements: Settlement[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [received, setReceived] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = settlements.filter((s) => s.status === "pending");
  const received_ = settlements.filter((s) => s.status === "received");

  const selectedList = pending.filter((s) => selected.has(s.id));
  const expectedTotal = selectedList.reduce((sum, s) => sum + s.expectedFils, 0);
  const receivedFils = bhdToFils(Number(received) || 0);
  const derivedFee = Math.max(0, expectedTotal - receivedFils);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function reconcile() {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one pending settlement.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/money/settlements/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: [...selected],
        receivedTotalBhd: Number(received) || 0,
        receivedOn,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Reconcile failed");
      return;
    }
    setSelected(new Set());
    setReceived("");
    router.refresh();
  }

  return (
    <div>
      <p className="text-ink-3 mb-4 text-sm leading-relaxed">
        Select the days a platform paid you for, enter the total you received,
        and the app works out the commission and lands the money in the bank.
      </p>

      {pending.length === 0 ? (
        <EmptyState message="No pending delivery settlements. They appear here automatically when you approve a daily closing." />
      ) : (
        <>
          <Card className="mb-4 p-0">
            {pending.map((s, i) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-3 px-5 py-3.5 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold">
                      {s.platform ?? "Delivery"}
                    </span>
                    <span className="text-ink-3 text-[13px]">
                      {s.salesDate ?? s.periodLabel}
                    </span>
                  </div>
                  <div className="text-ink-3 text-[12.5px]">
                    Gross {s.grossFils !== null ? formatFils(s.grossFils) : "—"} ·
                    commission {s.feeFils !== null ? formatFils(s.feeFils) : "—"}
                  </div>
                </div>
                <div className="text-ink w-24 text-right font-mono text-sm font-bold">
                  {formatFils(s.expectedFils)}
                </div>
              </label>
            ))}
          </Card>

          <Card className="mb-6">
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <Label htmlFor="rec-amount">Total received (BHD)</Label>
                  <Input
                    id="rec-amount"
                    type="number"
                    min="0"
                    step="0.001"
                    value={received}
                    onChange={(e) => setReceived(e.target.value)}
                    placeholder={formatFils(expectedTotal)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="rec-date">Received on</Label>
                  <Input
                    id="rec-date"
                    type="date"
                    value={receivedOn}
                    onChange={(e) => setReceivedOn(e.target.value)}
                  />
                </div>
                <Button onClick={reconcile} disabled={loading}>
                  {loading ? "Saving..." : "Reconcile"}
                </Button>
              </div>

              <div className="text-ink-2 mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <Stat label="Expected" value={formatFils(expectedTotal)} />
                <Stat
                  label="Received"
                  value={formatFils(receivedFils)}
                />
                <Stat
                  label="Commission / fees"
                  value={formatFils(derivedFee)}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {received_.length > 0 && (
        <>
          <div className="text-ink-3 mb-2 text-xs font-semibold uppercase tracking-wide">
            Received
          </div>
          <Card className="p-0">
            {received_.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold">
                      {s.platform ?? "Delivery"}
                    </span>
                    <span className="text-ink-3 text-[13px]">
                      {s.salesDate ?? s.periodLabel}
                    </span>
                    <Badge variant="green">Received</Badge>
                  </div>
                  <div className="text-ink-3 text-[12.5px]">
                    {s.actualFils !== null &&
                      `Got ${formatFils(s.actualFils)} on ${s.receivedOn}`}
                    {s.feeFils !== null && ` · commission ${formatFils(s.feeFils)}`}
                  </div>
                </div>
                <div className="text-ink-3 w-24 text-right font-mono text-sm">
                  {formatFils(s.expectedFils)}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg rounded-xl px-3 py-2.5">
      <div className="text-ink-3 text-xs">{label}</div>
      <div className="text-ink mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}
