"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatFils } from "@/lib/calculations/currency";
import type { ItemDeletionImpact } from "@/services/inventory";

interface DeleteItemButtonProps {
  itemId: string;
  impact: ItemDeletionImpact;
  /** Where to go after the item is deleted. */
  redirectTo: string;
}

/**
 * Soft-deletes an inventory item after showing what it affects. History is
 * kept, so past Profit/Losses numbers do not move — only future lists and
 * pickers lose the item.
 */
export function DeleteItemButton({
  itemId,
  impact,
  redirectTo,
}: DeleteItemButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/inventory/${itemId}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Delete failed");
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Delete item
      </Button>
    );
  }

  return (
    <div className="border-line bg-bg mt-3 rounded-xl border p-4 text-sm">
      <p className="font-semibold">Delete {impact.itemName}?</p>
      <ul className="text-ink-2 mt-2 list-disc space-y-1 pl-5 text-[13px]">
        <li>
          It disappears from inventory lists, the worker&apos;s screens, waste
          and count forms, and recipe pickers.
        </li>
        <li>
          Past purchases, waste, counts and COGS are kept — your old reports do
          not change.
        </li>
        {impact.stockBaseQty !== 0 && (
          <li>
            It still has{" "}
            <span className="font-semibold">
              {Math.round(impact.stockBaseQty * 100) / 100} {impact.baseUnit}
            </span>{" "}
            on hand, worth {formatFils(impact.stockValueFils)} BHD. That value
            stops being counted in your stock total.
          </li>
        )}
      </ul>

      {impact.inRecipes.length > 0 && (
        <div className="bg-rush-red-bg text-rush-red mt-3 rounded-lg px-3 py-2 text-[13px]">
          <span className="font-semibold">
            Still used in {impact.inRecipes.length} recipe
            {impact.inRecipes.length === 1 ? "" : "s"}:
          </span>{" "}
          {impact.inRecipes.map((p) => p.name).join(", ")}. Those products will
          stop deducting this item when they sell.
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={loading}>
          {loading ? "Deleting..." : "Delete item"}
        </Button>
      </div>

      {error && <p className="text-rush-red mt-2 text-xs">{error}</p>}
    </div>
  );
}
