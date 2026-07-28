"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BalanceAdjustment, CashAccount } from "@/types/money";
import { formatFils, bhdToFils } from "@/lib/calculations/currency";
import { todayInBahrain } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Trash2 } from "lucide-react";

const GREEN = "var(--color-rush-green, #1a7f4b)";
const RED = "var(--color-rush-red, #c0392b)";

interface Props {
  registerBalanceFils: number;
  bankBalanceFils: number;
  adjustments: BalanceAdjustment[];
}

export function BalanceAdjust({
  registerBalanceFils,
  bankBalanceFils,
  adjustments,
}: Props) {
  const router = useRouter();
  const [account, setAccount] = useState<CashAccount>("bank");
  const [actualBhd, setActualBhd] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayInBahrain());
  const [affectsPl, setAffectsPl] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedFils =
    account === "register" ? registerBalanceFils : bankBalanceFils;
  const actual = actualBhd === "" ? null : Number(actualBhd);
  const diffFils =
    actual === null || Number.isNaN(actual)
      ? null
      : bhdToFils(actual) - expectedFils;

  const submit = async () => {
    if (actual === null || Number.isNaN(actual) || actual < 0) {
      setError("Enter the amount you actually counted");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/money/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account,
        actualBhd: actual,
        occurredOn,
        affectsPl,
        note: note || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : "Failed to save");
      return;
    }
    setActualBhd("");
    setNote("");
    router.refresh();
  };

  const remove = async (id: string) => {
    if (
      !window.confirm(
        "Delete this adjustment? Its posted movement will be reversed and the balance goes back to the old number.",
      )
    ) {
      return;
    }
    await fetch(`/api/money/adjustments/${id}`, { method: "DELETE" });
    router.refresh();
  };

  // Drift summary per account.
  const drift = (acc: CashAccount) =>
    adjustments
      .filter((a) => a.account === acc)
      .reduce((s, a) => s + a.diffFils, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Register (books)" value={`${formatFils(registerBalanceFils)} BHD`} />
        <MetricCard label="Bank (books)" value={`${formatFils(bankBalanceFils)} BHD`} />
        <MetricCard
          label="Register drift (all time)"
          value={`${drift("register") < 0 ? "−" : ""}${formatFils(Math.abs(drift("register")))} BHD`}
          accent={drift("register") < 0 ? RED : undefined}
        />
        <MetricCard
          label="Bank drift (all time)"
          value={`${drift("bank") < 0 ? "−" : ""}${formatFils(Math.abs(drift("bank")))} BHD`}
          accent={drift("bank") < 0 ? RED : undefined}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-base font-bold">Check a balance</h2>

          <div className="flex gap-2">
            {(["register", "bank"] as const).map((acc) => (
              <button
                key={acc}
                type="button"
                onClick={() => setAccount(acc)}
                className={`h-9 rounded-lg border px-4 text-sm font-semibold transition-colors ${
                  account === acc
                    ? "border-navy bg-navy text-white"
                    : "border-line bg-card text-ink-2 hover:border-ink-3"
                }`}
              >
                {acc === "register" ? "Register" : "Bank"}
              </button>
            ))}
          </div>

          <div className="text-ink-2 text-sm">
            The books say{" "}
            <span className="font-mono font-bold">
              {formatFils(expectedFils)} BHD
            </span>{" "}
            should be in the {account === "register" ? "register" : "bank"}.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="actual">What you actually have (BHD)</Label>
              <Input
                id="actual"
                type="number"
                step="0.001"
                min="0"
                value={actualBhd}
                onChange={(e) => setActualBhd(e.target.value)}
                placeholder="0.000"
              />
            </div>
            <div>
              <Label htmlFor="adj-date">Date</Label>
              <Input
                id="adj-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </div>
          </div>

          {diffFils !== null && (
            <div
              className="rounded-lg px-4 py-3 text-sm font-semibold"
              style={{
                background: "var(--color-bg, #f6f6f4)",
                color: diffFils === 0 ? GREEN : diffFils > 0 ? GREEN : RED,
              }}
            >
              {diffFils === 0
                ? "Matches the books exactly — the check will be logged with no change."
                : diffFils > 0
                  ? `You have ${formatFils(diffFils)} BHD MORE than the books. Confirming adds it as a gain.`
                  : `You have ${formatFils(-diffFils)} BHD LESS than the books. Confirming records the shortage.`}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={affectsPl}
              onChange={(e) => setAffectsPl(e.target.checked)}
            />
            Count the difference in profit reports (gain / loss)
          </label>

          <div>
            <Label htmlFor="adj-note">Note (optional)</Label>
            <Input
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. end-of-July bank check"
            />
          </div>

          {error && <p className="text-rush-red text-sm">{error}</p>}

          <div>
            <Button onClick={submit} disabled={saving || actualBhd === ""}>
              {saving ? "Saving…" : "Confirm adjustment"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="p-0">
        <div className="border-line-2 border-b px-5 py-4">
          <h2 className="text-base font-bold">Adjustment history</h2>
          <p className="text-ink-3 mt-0.5 text-xs">
            Every check is logged — including ones that matched exactly.
          </p>
        </div>
        {adjustments.length === 0 ? (
          <EmptyState message="No balance checks yet." />
        ) : (
          <div className="flex flex-col">
            {adjustments.map((a) => (
              <div
                key={a.id}
                className="border-line-2 flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {a.account === "register" ? "Register" : "Bank"} ·{" "}
                    {new Date(a.occurredOn).toLocaleDateString()}
                  </div>
                  <div className="text-ink-3 text-xs">
                    books {formatFils(a.expectedFils)} → counted{" "}
                    {formatFils(a.actualFils)}
                    {a.note ? ` · ${a.note}` : ""}
                  </div>
                </div>
                <span
                  className="font-mono text-sm font-bold"
                  style={{
                    color:
                      a.diffFils === 0 ? undefined : a.diffFils > 0 ? GREEN : RED,
                  }}
                >
                  {a.diffFils === 0
                    ? "exact"
                    : `${a.diffFils > 0 ? "+" : "−"}${formatFils(Math.abs(a.diffFils))}`}
                </span>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-ink-3 hover:text-rush-red p-1 transition-colors"
                  aria-label="Delete adjustment"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
