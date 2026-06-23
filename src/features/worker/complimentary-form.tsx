"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/inventory";
import type { ComplimentaryLog } from "@/types/pos";
import { formatFils } from "@/lib/calculations/currency";
import { COMPLIMENTARY_REASONS } from "@/lib/validators/pos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Gift, Trash2, Package } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  customer_remake: "Customer remake",
  staff: "Staff",
  influencer: "Influencer",
  quality_check: "Quality check",
  customer_goodwill: "Customer goodwill",
  loyalty: "Loyalty",
  other: "Other",
};

interface ComplimentaryFormProps {
  products: Product[];
  todayLogs: ComplimentaryLog[];
}

export function ComplimentaryForm({ products, todayLogs: initialLogs }: ComplimentaryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [amountBhd, setAmountBhd] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [todayLogs, setTodayLogs] = useState<ComplimentaryLog[]>(initialLogs);

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId) ?? null
    : null;

  function selectProduct(product: Product) {
    setSelectedProductId(product.id);
    setIsCustom(false);
    setAmountBhd((product.priceFils / 1000).toFixed(3));
    setCustomDescription("");
  }

  function selectCustom() {
    setSelectedProductId(null);
    setIsCustom(true);
    setAmountBhd("");
    setCustomDescription("");
  }

  function resetForm() {
    setSelectedProductId(null);
    setIsCustom(false);
    setCustomDescription("");
    setAmountBhd("");
    setReason("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedProductId && !isCustom) {
      setError("Select a product or tap 'Other'.");
      return;
    }
    if (isCustom && !customDescription.trim()) {
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

    const body: Record<string, unknown> = {
      amountBhd: Number(amountBhd),
      reason,
      notes: notes.trim() || undefined,
    };

    if (selectedProductId) {
      body.productId = selectedProductId;
    } else {
      body.description = customDescription.trim();
    }

    const res = await fetch("/api/worker/complimentary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

    const newLog = await res.json();
    setTodayLogs([newLog, ...todayLogs]);
    resetForm();
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(logId: string) {
    setDeletingId(logId);

    const res = await fetch(`/api/worker/complimentary/${logId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setTodayLogs(todayLogs.filter((l) => l.id !== logId));
    }

    setDeletingId(null);
    router.refresh();
  }

  const totalFils = todayLogs.reduce((s, l) => s + l.amountFils, 0);

  return (
    <div className="pb-24">
      <form onSubmit={handleSubmit}>
        {/* Product picker */}
        <Card className="mb-4">
          <CardContent>
            <Label className="mb-2 block">What was given?</Label>
            <div className="flex flex-wrap gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProduct(p)}
                  className={`rounded-xl border px-3.5 py-2 text-left text-sm transition-colors ${
                    selectedProductId === p.id
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-white text-ink hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className={`text-xs ${selectedProductId === p.id ? "text-white/70" : "text-ink-3"}`}>
                    {(p.priceFils / 1000).toFixed(3)} BHD
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={selectCustom}
                className={`rounded-xl border px-3.5 py-2 text-left text-sm transition-colors ${
                  isCustom
                    ? "border-navy bg-navy text-white"
                    : "border-dashed border-line bg-white text-ink-3 hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold">Other</div>
                <div className={`text-xs ${isCustom ? "text-white/70" : "text-ink-3"}`}>
                  Custom item
                </div>
              </button>
            </div>

            {isCustom && (
              <div className="mt-3">
                <Input
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g., Extra shot for customer"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amount + reason + notes */}
        {(selectedProductId || isCustom) && (
          <Card className="mb-4">
            <CardContent>
              <div className="flex flex-col gap-4">
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
                  {selectedProduct && (
                    <div className="text-ink-3 mt-1 text-xs">
                      Menu price: {(selectedProduct.priceFils / 1000).toFixed(3)} BHD
                    </div>
                  )}
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
        )}

        {error && (
          <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        {(selectedProductId || isCustom) && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-[22px] py-4 backdrop-blur-sm">
            <div className="mx-auto max-w-[540px]">
              <Button type="submit" full size="lg" disabled={loading}>
                {loading ? "Submitting..." : "Log Complimentary"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Today's logged items */}
      {todayLogs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-bold">
                <Package size={18} className="text-purple-500" />
                Today&apos;s Complimentary ({todayLogs.length})
              </div>
              <div className="font-mono text-sm font-semibold">
                {formatFils(totalFils)} BHD
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {todayLogs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                  <Gift size={16} className="text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{log.description}</div>
                  <div className="text-ink-3 text-xs">
                    {formatFils(log.amountFils)} BHD · {REASON_LABELS[log.reason] || log.reason}
                  </div>
                </div>
                {log.status === "needs_review" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id)}
                    disabled={deletingId === log.id}
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
