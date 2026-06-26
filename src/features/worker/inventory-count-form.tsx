"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItemOps, InventoryCount } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Trash2 } from "lucide-react";

interface Props {
  items: InventoryItemOps[];
  ownCounts: InventoryCount[];
}

export function InventoryCountForm({ items, ownCounts: initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // itemId -> raw input string. Blank = not counted (skipped); "0" = counted empty.
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [ownCounts, setOwnCounts] = useState<InventoryCount[]>(initial);

  // Group items by category for an easier shelf walk.
  const groups = useMemo(() => {
    const map = new Map<string, InventoryItemOps[]>();
    for (const item of items) {
      const key = item.category?.trim() || "Uncategorized";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const countedCount = Object.values(counts).filter(
    (v) => v.trim() !== "",
  ).length;

  function setCount(itemId: string, value: string) {
    setCounts((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payloadItems = Object.entries(counts)
      .filter(([, v]) => v.trim() !== "")
      .map(([inventoryItemId, v]) => ({
        inventoryItemId,
        countedStockQty: Number(v),
      }));

    if (payloadItems.length === 0) {
      setError("Enter a counted quantity for at least one item.");
      return;
    }
    if (payloadItems.some((i) => !Number.isFinite(i.countedStockQty) || i.countedStockQty < 0)) {
      setError("Counted quantities must be zero or more.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/worker/inventory-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: notes.trim() || undefined,
        items: payloadItems,
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

    const newCount = await res.json();
    setOwnCounts([newCount, ...ownCounts]);
    setCounts({});
    setNotes("");
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/worker/inventory-count/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setOwnCounts(ownCounts.filter((c) => c.id !== id));
    }
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="pb-28">
      <form onSubmit={handleSubmit}>
        {groups.map(([category, groupItems]) => (
          <Card key={category} className="mb-4">
            <CardHeader>
              <div className="text-ink text-sm font-bold tracking-wide uppercase">
                {category}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {groupItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-5 py-3 ${
                    i > 0 ? "border-line-2 border-t" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-ink-3 text-xs">
                      Counted in {item.stockUnit}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={counts[item.id] ?? ""}
                    onChange={(e) => setCount(item.id, e.target.value)}
                    placeholder="—"
                    className="w-28 text-right font-mono"
                    aria-label={`Counted ${item.name} in ${item.stockUnit}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card className="mb-4">
          <CardContent>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the owner should know..."
            />
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
              {loading
                ? "Submitting..."
                : `Submit Count${countedCount > 0 ? ` (${countedCount})` : ""}`}
            </Button>
          </div>
        </div>
      </form>

      {ownCounts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2 text-base font-bold">
              <ClipboardList size={18} className="text-navy" />
              Your Recent Counts ({ownCounts.length})
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ownCounts.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {new Date(c.countedAt).toLocaleDateString()}{" "}
                    {new Date(c.countedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {c.notes && (
                    <div className="text-ink-3 truncate text-xs">{c.notes}</div>
                  )}
                </div>
                {c.status === "needs_review" ? (
                  <>
                    <Badge variant="amber">Pending</Badge>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-ink-3 hover:text-rush-red shrink-0 rounded-lg p-2 transition-colors"
                      aria-label="Delete pending count"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <Badge variant="green">Approved</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
