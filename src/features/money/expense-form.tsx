"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHODS, EXPENSE_CATEGORIES } from "@/types/money";
import { formatBhd } from "@/lib/calculations/currency";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, X, Check } from "lucide-react";

interface Line {
  id: number;
  category: string;
  amount: string;
  description: string;
}

let nextId = 1;
function blankLine(): Line {
  return { id: nextId++, category: EXPENSE_CATEGORIES[0], amount: "", description: "" };
}

export function ExpenseForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [spentOn, setSpentOn] = useState(today);
  const [method, setMethod] = useState<string>("Cash");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine(), blankLine()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    setError(null);
    const validLines = lines
      .filter((l) => Number(l.amount) > 0)
      .map((l) => ({
        category: l.category,
        amountBhd: Number(l.amount),
        description: l.description.trim() || undefined,
      }));

    if (validLines.length === 0) {
      setError("Add at least one expense line with an amount.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/money/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spentOn,
        method,
        note: note.trim() || undefined,
        lines: validLines,
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
    <div className="max-w-3xl">
      <button
        onClick={onDone}
        className="text-ink-3 hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        ← Back to Money
      </button>
      <h1 className="text-ink mb-1 text-2xl font-bold">New Expense</h1>
      <p className="text-ink-2 mb-5 text-sm">
        Normal expenses hit both cash flow and the P&amp;L. One receipt can split
        across categories.
      </p>

      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="method">Payment method</Label>
              <Select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="note">Notes</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-[15px] font-bold">Expense lines</CardHeader>
        <CardContent>
          {lines.map((l) => (
            <div
              key={l.id}
              className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[1.2fr_1fr_2fr_auto] sm:items-end"
            >
              <div>
                <Label className="sm:hidden">Category</Label>
                <Select
                  value={l.category}
                  onChange={(e) => updateLine(l.id, { category: e.target.value })}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="sm:hidden">Amount (BHD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={l.amount}
                  onChange={(e) => updateLine(l.id, { amount: e.target.value })}
                  placeholder="0.000"
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="sm:hidden">Description</Label>
                <Input
                  value={l.description}
                  onChange={(e) =>
                    updateLine(l.id, { description: e.target.value })
                  }
                  placeholder="optional"
                />
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={() =>
                  setLines((ls) =>
                    ls.length > 1 ? ls.filter((x) => x.id !== l.id) : ls,
                  )
                }
                aria-label="Remove line"
              >
                <X size={16} />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            full
            className="mt-2 border-dashed"
            onClick={() => setLines((ls) => [...ls, blankLine()])}
          >
            <Plus size={16} className="mr-1.5" />
            Add expense line
          </Button>

          <div className="bg-bg mt-4 flex items-center justify-between rounded-xl px-4 py-3">
            <span className="text-ink-2 text-sm font-semibold">Total</span>
            <span className="text-ink font-mono font-bold">
              {formatBhd(total)} BHD
            </span>
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
          {loading ? "Saving..." : "Save Expense"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
