"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItemOps, WasteLog } from "@/types/inventory";
import { WASTE_REASONS } from "@/lib/validators/waste";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  spoilage: "Spoilage",
  breakage: "Breakage",
  expired: "Expired",
  training: "Training",
  other: "Other",
};

interface WasteFormProps {
  items: InventoryItemOps[];
  todayLogs: WasteLog[];
}

export function WasteForm({ items, todayLogs: initialLogs }: WasteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [stockQty, setStockQty] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [todayLogs, setTodayLogs] = useState<WasteLog[]>(initialLogs);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const selectedItem = selectedItemId ? itemMap.get(selectedItemId) : undefined;

  function resetForm() {
    setSelectedItemId("");
    setStockQty("");
    setReason("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError("Select an item.");
      return;
    }
    if (!stockQty || Number(stockQty) <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    if (!reason) {
      setError("Select a reason.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/worker/waste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventoryItemId: selectedItemId,
        stockQty: Number(stockQty),
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

    const newLog = await res.json();
    setTodayLogs([newLog, ...todayLogs]);
    resetForm();
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(logId: string) {
    setDeletingId(logId);

    const res = await fetch(`/api/worker/waste/${logId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setTodayLogs(todayLogs.filter((l) => l.id !== logId));
    }

    setDeletingId(null);
    router.refresh();
  }

  function describeQty(log: WasteLog): string {
    const item = itemMap.get(log.inventoryItemId);
    if (!item) return `${log.baseQty}`;
    const stockQtyValue = log.baseQty / (item.basePerStock || 1);
    return `${stockQtyValue} ${item.stockUnit}`;
  }

  return (
    <div className="pb-24">
      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="item">Item</Label>
                <Select
                  id="item"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  <option value="">Select item...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="qty">
                  Quantity{selectedItem ? ` (${selectedItem.stockUnit})` : ""}
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  step="any"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="0"
                  className="font-mono"
                />
                {selectedItem && (
                  <div className="text-ink-3 mt-1 text-xs">
                    On hand: {selectedItem.stockBaseQty / (selectedItem.basePerStock || 1)}{" "}
                    {selectedItem.stockUnit}
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
                  {WASTE_REASONS.map((r) => (
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
              {loading ? "Submitting..." : "Record Waste"}
            </Button>
          </div>
        </div>
      </form>

      {todayLogs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2 text-base font-bold">
              <Trash2 size={18} className="text-rush-red" />
              Today&apos;s Waste ({todayLogs.length})
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                  <Trash2 size={16} className="text-rush-red" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {itemMap.get(log.inventoryItemId)?.name ?? "Item"}
                  </div>
                  <div className="text-ink-3 text-xs">
                    {describeQty(log)} · {REASON_LABELS[log.reason] || log.reason}
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
