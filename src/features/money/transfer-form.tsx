"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBhd } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check } from "lucide-react";

export function TransferForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!(Number(amount) > 0)) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/money/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountBhd: Number(amount), occurredOn }),
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
      <h1 className="text-ink mb-1 text-2xl font-bold">Deposit to Bank</h1>
      <p className="text-ink-2 mb-5 text-sm">
        Move cash from the register into the bank account. Total money stays the
        same — only the register/bank split changes.
      </p>

      <Card>
        <CardContent>
          <div className="text-ink-2 mb-4 flex items-center justify-center gap-3 text-sm font-semibold">
            <span>Register</span>
            <ArrowRight size={16} className="text-ink-3" />
            <span>Bank</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tr-amount">Amount (BHD)</Label>
              <Input
                id="tr-amount"
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
              <Label htmlFor="tr-date">Date</Label>
              <Input
                id="tr-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </div>
          </div>

          <p className="text-ink-3 mt-3 text-xs">
            Preview: register −{formatBhd(Number(amount) || 0)} BHD, bank +
            {formatBhd(Number(amount) || 0)} BHD
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
          {loading ? "Saving..." : "Record Deposit"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
