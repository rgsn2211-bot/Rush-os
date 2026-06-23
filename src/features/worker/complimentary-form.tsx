"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMPLIMENTARY_REASONS } from "@/lib/validators/pos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Check } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  customer_remake: "Customer remake",
  staff: "Staff",
  influencer: "Influencer",
  quality_check: "Quality check",
  customer_goodwill: "Customer goodwill",
  loyalty: "Loyalty",
  other: "Other",
};

export function ComplimentaryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [description, setDescription] = useState("");
  const [amountBhd, setAmountBhd] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Enter a description.");
      return;
    }
    if (!amountBhd || Number(amountBhd) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!reason) {
      setError("Select a reason.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/worker/complimentary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        amountBhd: Number(amountBhd),
        reason,
        notes: notes.trim() || undefined,
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

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="bg-green-bg mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Check size={32} className="text-green-600" strokeWidth={2.5} />
        </div>
        <h2 className="text-ink mb-2 text-xl font-bold">
          Complimentary logged
        </h2>
        <p className="text-ink-2 mb-6 max-w-xs text-[14.5px] leading-relaxed">
          Pending owner review.
        </p>
        <Button onClick={() => router.push("/worker")} size="lg">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="description">What was given?</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Flat White for customer remake"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (BHD)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.001"
                value={amountBhd}
                onChange={(e) => setAmountBhd(e.target.value)}
                placeholder="0.000"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">Select reason...</option>
                {COMPLIMENTARY_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABELS[r] || r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
            {loading ? "Submitting..." : "Log Complimentary"}
          </Button>
        </div>
      </div>
    </form>
  );
}
