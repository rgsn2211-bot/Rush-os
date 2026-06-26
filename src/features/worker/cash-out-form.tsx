"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegisterCashOut } from "@/types/register-cash-out";
import { formatFils } from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Trash2 } from "lucide-react";

interface CashOutFormProps {
  todayCashOuts: RegisterCashOut[];
}

export function CashOutForm({ todayCashOuts: initial }: CashOutFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [kind, setKind] = useState<"purchase" | "withdrawal">("purchase");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const [cashOuts, setCashOuts] = useState<RegisterCashOut[]>(initial);

  function resetForm() {
    setAmount("");
    setReason("");
    setNote("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/worker/cash-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        amountBhd: Number(amount),
        reason: reason.trim(),
        note: note.trim() || undefined,
      }),
    });

    if (!res.ok) {
      let message = "Failed to submit";
      try {
        const data = await res.json();
        message =
          typeof data.error === "string"
            ? data.error
            : data.error?.formErrors?.[0] || message;
      } catch {
        // no JSON body
      }
      setError(message);
      setLoading(false);
      return;
    }

    const newCashOut = await res.json();
    setCashOuts([newCashOut, ...cashOuts]);
    resetForm();
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/worker/cash-out/${id}`, { method: "DELETE" });
    if (res.ok) setCashOuts(cashOuts.filter((c) => c.id !== id));
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="pb-24">
      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <Label>Type</Label>
                <div className="flex gap-3">
                  {(["purchase", "withdrawal"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition-colors ${
                        kind === k
                          ? "border-navy bg-navy text-white"
                          : "border-line text-ink-2 bg-card"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
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
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    kind === "purchase"
                      ? "e.g. Milk run from the supermarket"
                      : "e.g. Owner withdrawal"
                  }
                />
              </div>

              <div>
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional details..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-[22px] py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-[540px]">
            <Button type="submit" full size="lg" disabled={loading}>
              {loading ? "Submitting..." : "Record Cash Out"}
            </Button>
          </div>
        </div>
      </form>

      {cashOuts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2 text-base font-bold">
              <Banknote size={18} className="text-navy" />
              Today&apos;s Cash Outs ({cashOuts.length})
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {cashOuts.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <div className="bg-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <Banknote size={16} className="text-navy" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold capitalize">
                    {c.kind} · {formatFils(c.amountFils)} BHD
                  </div>
                  <div className="text-ink-3 text-xs">{c.reason}</div>
                </div>
                {c.status === "needs_review" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="text-ink-3 hover:text-rush-red shrink-0 rounded-lg p-2 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
