"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBhd } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Check } from "lucide-react";

const IN_REASONS = [
  "Owner injection",
  "Loan received",
  "Bank transfer in",
  "Other income",
];
const OUT_REASONS = [
  "Owner withdrawal",
  "Loan payment",
  "Bank transfer out",
  "Other cash movement",
];
const METHODS = ["Cash", "Bank transfer", "Card"];

export function CashMovementForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [reason, setReason] = useState(IN_REASONS[0]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [occurredOn, setOccurredOn] = useState(today);
  const [affectsPl, setAffectsPl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = direction === "in" ? IN_REASONS : OUT_REASONS;

  function switchDirection(d: "in" | "out") {
    setDirection(d);
    setReason((d === "in" ? IN_REASONS : OUT_REASONS)[0]);
  }

  async function handleSave() {
    setError(null);
    if (!(Number(amount) > 0)) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/money/cash-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction,
        reason,
        amountBhd: Number(amount),
        method,
        occurredOn,
        affectsPl,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save");
      return;
    }

    router.refresh();
    onDone();
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={onDone}
        className="text-ink-3 hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        ← Back to Money
      </button>
      <h1 className="text-ink mb-1 text-2xl font-bold">Manual Cash Movement</h1>
      <p className="text-ink-2 mb-5 text-sm">
        Money in/out not tied to a sale or purchase.
      </p>

      <Card>
        <CardContent>
          <div className="mb-4 flex gap-3">
            {(["in", "out"] as const).map((d) => (
              <button
                key={d}
                onClick={() => switchDirection(d)}
                className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                  direction === d
                    ? "border-navy bg-navy text-white"
                    : "border-line text-ink-2 bg-card"
                }`}
              >
                {d === "in" ? "Money In" : "Money Out"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount (BHD)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="cm-method">Method</Label>
              <Select
                id="cm-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="cm-date">Date</Label>
              <Input
                id="cm-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </div>
          </div>

          <label className="bg-bg mt-4 flex cursor-pointer items-center justify-between rounded-xl px-4 py-3">
            <span>
              <span className="text-ink block text-sm font-semibold">
                Affects P&amp;L
              </span>
              <span className="text-ink-3 block text-xs">
                Default is cash flow only
              </span>
            </span>
            <input
              type="checkbox"
              checked={affectsPl}
              onChange={(e) => setAffectsPl(e.target.checked)}
              className="h-5 w-5"
            />
          </label>

          <p className="text-ink-3 mt-3 text-xs">
            Preview:{" "}
            <span
              className={
                direction === "in" ? "text-rush-green" : "text-rush-red"
              }
            >
              {direction === "in" ? "+" : "−"}
              {formatBhd(Number(amount) || 0)} BHD
            </span>
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-rush-red-bg text-rush-red mt-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Button size="lg" onClick={handleSave} disabled={loading}>
          <Check size={18} className="mr-1.5" />
          {loading ? "Saving..." : "Record Movement"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
