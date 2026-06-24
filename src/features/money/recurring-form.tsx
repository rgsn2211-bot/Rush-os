"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecurringFrequency } from "@/types/money";
import { RECURRING_TYPES, RECURRING_FREQUENCIES } from "@/types/money";
import { PAYMENT_METHODS } from "@/types/money";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Check } from "lucide-react";

export function RecurringForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [costType, setCostType] = useState<string>(RECURRING_TYPES[0]);
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("Monthly");
  const [nextDueDate, setNextDueDate] = useState(today);
  const [defaultMethod, setDefaultMethod] = useState<string>("Bank transfer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Enter a name (e.g. 'Shop Rent').");
      return;
    }
    if (!(Number(amount) > 0)) {
      setError("Enter an amount.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/money/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        costType,
        amountBhd: Number(amount),
        frequency,
        nextDueDate,
        defaultMethod,
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
      <h1 className="text-ink mb-1 text-2xl font-bold">
        New Recurring / Upcoming Cost
      </h1>
      <p className="text-ink-2 mb-5 text-sm">
        For cash planning — it becomes an expense when you mark it paid.
      </p>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shop Rent"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                id="type"
                value={costType}
                onChange={(e) => setCostType(e.target.value)}
              >
                {RECURRING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                id="frequency"
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as RecurringFrequency)
                }
              >
                {RECURRING_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="due">Next due date</Label>
              <Input
                id="due"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="method">Default payment method</Label>
              <Select
                id="method"
                value={defaultMethod}
                onChange={(e) => setDefaultMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
          </div>
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
          {loading ? "Saving..." : "Save Cost"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
