"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  InventoryCountWithItems,
  InventoryCountItemWithDetails,
} from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Props {
  count: InventoryCountWithItems;
}

/** A base-unit quantity shown in stock units (trailing zeros trimmed). */
function toStock(baseQty: number, basePerStock: number): number {
  return baseQty / (basePerStock || 1);
}

export function InventoryCountDetail({ count }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = count.status === "needs_review";
  const isApproved = count.status === "approved";

  async function handleReview(action: "approve" | "reject") {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/inventory-count/${count.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Action failed");
      setLoading(false);
      return;
    }

    router.push("/owner/inventory-count");
    router.refresh();
  }

  function varianceCell(line: InventoryCountItemWithDetails) {
    const v = toStock(line.varianceBaseQty, line.basePerStock);
    if (v === 0) return <span className="text-ink-3">0</span>;
    const cls = v < 0 ? "text-rush-red" : "text-emerald-600";
    return (
      <span className={`font-semibold ${cls}`}>
        {v > 0 ? "+" : "−"}
        {Math.abs(v)} {line.stockUnit ?? ""}
      </span>
    );
  }

  function valueCell(line: InventoryCountItemWithDetails) {
    if (!isApproved) return <span className="text-ink-3">—</span>;
    if (line.valueFils === 0) return <span className="text-ink-3">0.000</span>;
    const cls = line.valueFils < 0 ? "text-rush-red" : "text-emerald-600";
    return (
      <span className={`font-semibold ${cls}`}>
        {line.valueFils > 0 ? "+" : "−"}
        {formatFils(Math.abs(line.valueFils))}
      </span>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="text-ink-3 grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] gap-2 border-b border-line-2 px-5 py-3 text-[11px] font-bold tracking-wider uppercase">
          <div>Item</div>
          <div className="text-right">Expected</div>
          <div className="text-right">Counted</div>
          <div className="text-right">Variance</div>
          <div className="text-right">Value (BHD)</div>
        </div>
        {count.items.map((line, i) => (
          <div
            key={line.id}
            className={`grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] items-center gap-2 px-5 py-3 text-sm ${
              i > 0 ? "border-line-2 border-t" : ""
            }`}
          >
            <div className="min-w-0 font-semibold">
              {line.itemName ?? "Item"}
              {line.stockUnit && (
                <span className="text-ink-3 ml-1 text-xs font-normal">
                  ({line.stockUnit})
                </span>
              )}
            </div>
            <div className="text-ink-2 text-right font-mono">
              {toStock(line.expectedBaseQty, line.basePerStock)}
            </div>
            <div className="text-right font-mono">
              {toStock(line.countedBaseQty, line.basePerStock)}
            </div>
            <div className="text-right font-mono">{varianceCell(line)}</div>
            <div className="text-right font-mono">{valueCell(line)}</div>
          </div>
        ))}
      </Card>

      {isPending && (
        <>
          <p className="text-ink-3 mt-4 text-sm">
            Approving sets each item&apos;s on-hand to the counted amount and
            revalues it at its current average cost. Shortages post a loss;
            overages add value.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => handleReview("approve")}
              disabled={loading}
            >
              <Check size={16} className="mr-1" />
              Approve &amp; reconcile
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleReview("reject")}
              disabled={loading}
              className="text-rush-red"
            >
              <X size={16} className="mr-1" />
              Reject
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
