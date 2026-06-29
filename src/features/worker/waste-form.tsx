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

interface WasteLine {
  inventoryItemId: string;
  name: string;
  stockUnit: string;
  basePerStock: number;
  stockBaseQty: number;
  stockQty: string;
  reason: string;
  notes: string;
}

interface WasteFormProps {
  items: InventoryItemOps[];
  todayLogs: WasteLog[];
}

export function WasteForm({ items, todayLogs: initialLogs }: WasteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [lines, setLines] = useState<WasteLine[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const [todayLogs, setTodayLogs] = useState<WasteLog[]>(initialLogs);

  const itemMap = new Map(items.map((i) => [i.id, i]));

  function addLine(item: InventoryItemOps) {
    if (lines.some((l) => l.inventoryItemId === item.id)) return;
    setLines([
      ...lines,
      {
        inventoryItemId: item.id,
        name: item.name,
        stockUnit: item.stockUnit,
        basePerStock: item.basePerStock,
        stockBaseQty: item.stockBaseQty,
        stockQty: "",
        reason: "",
        notes: "",
      },
    ]);
    setShowPicker(false);
  }

  function updateLine(index: number, patch: Partial<WasteLine>) {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError("Add at least one item.");
      return;
    }
    for (const l of lines) {
      if (!l.stockQty || Number(l.stockQty) <= 0) {
        setError(`Enter a valid quantity for ${l.name}.`);
        return;
      }
      if (!l.reason) {
        setError(`Select a reason for ${l.name}.`);
        return;
      }
    }

    setLoading(true);

    const res = await fetch("/api/worker/waste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          stockQty: Number(l.stockQty),
          reason: l.reason,
          notes: l.notes.trim() || undefined,
        })),
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

    const newLogs: WasteLog[] = await res.json();
    setTodayLogs([...newLogs, ...todayLogs]);
    setLines([]);
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

  const usedIds = new Set(lines.map((l) => l.inventoryItemId));
  const availableItems = items.filter((i) => !usedIds.has(i.id));

  return (
    <div className="pb-24">
      <form onSubmit={handleSubmit}>
        {lines.map((l, i) => (
          <Card key={l.inventoryItemId} className="mb-3.5">
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-navy text-sm font-bold">
                  Item {i + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="text-rush-red text-[13px] font-semibold"
                >
                  Remove
                </button>
              </div>

              <div className="mb-3 text-[15px] font-semibold">{l.name}</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantity ({l.stockUnit})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={l.stockQty}
                    onChange={(e) =>
                      updateLine(i, { stockQty: e.target.value })
                    }
                    placeholder="0"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Select
                    value={l.reason}
                    onChange={(e) => updateLine(i, { reason: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {WASTE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REASON_LABELS[r] || r}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-3">
                <Label>Notes (optional)</Label>
                <Input
                  value={l.notes}
                  onChange={(e) => updateLine(i, { notes: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>

              <div className="text-ink-3 mt-2.5 text-xs">
                On hand: {l.stockBaseQty / (l.basePerStock || 1)} {l.stockUnit}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add item button / picker */}
        {showPicker ? (
          <Card className="mb-4">
            <CardContent>
              <div className="mb-2 text-sm font-semibold">Select item</div>
              {availableItems.length === 0 ? (
                <p className="text-ink-3 text-sm">
                  {items.length === 0
                    ? "No inventory items yet."
                    : "All items are already added."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addLine(item)}
                      className="border-line text-navy cursor-pointer rounded-full border bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-50"
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-ink-3 mt-2 text-xs font-semibold"
              >
                Cancel
              </button>
            </CardContent>
          </Card>
        ) : (
          <Button
            type="button"
            variant="secondary"
            full
            size="lg"
            className="mb-4 border-dashed"
            onClick={() => setShowPicker(true)}
          >
            + Add item
          </Button>
        )}

        {error && (
          <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-[22px] py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-[540px]">
            {lines.length > 0 && (
              <div className="text-ink-2 mb-2 text-sm">
                {lines.length} item{lines.length > 1 ? "s" : ""}
              </div>
            )}
            <Button
              type="submit"
              full
              size="lg"
              disabled={loading || lines.length === 0}
            >
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
