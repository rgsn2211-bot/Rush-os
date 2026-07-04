"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bhdRateToFils } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/**
 * Owner review card for a worker-created inventory item. Approving requires the
 * cost the worker never set (a per-base-unit rate); rejecting voids the item.
 */
export function ItemReviewCard({
  itemId,
  baseUnit,
  submitterName,
}: {
  itemId: string;
  baseUnit: string;
  submitterName: string | null;
}) {
  const router = useRouter();
  const [costBhd, setCostBhd] = useState("");
  const [costingMethod, setCostingMethod] = useState<
    "weighted_average" | "fixed"
  >("weighted_average");
  const [loading, setLoading] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setError(null);
    setLoading(action);
    const body =
      action === "approve"
        ? {
            action,
            defaultCostFils: costBhd ? bhdRateToFils(Number(costBhd)) : 0,
            costingMethod,
          }
        : { action };

    const res = await fetch(`/api/inventory/${itemId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to review");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent>
        <h2 className="text-ink text-base font-bold">Needs your review</h2>
        <p className="text-ink-2 mt-1 text-sm">
          Added by {submitterName ?? "a worker"}. Set the cost, then approve — or
          reject to void it.
        </p>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <div>
            <Label htmlFor="review-cost">Default cost per {baseUnit} (BHD)</Label>
            <Input
              id="review-cost"
              type="number"
              min="0"
              step="any"
              value={costBhd}
              onChange={(e) => setCostBhd(e.target.value)}
              placeholder="0.000"
              className="bg-white font-mono"
            />
          </div>
          <div>
            <Label htmlFor="review-method">Costing method</Label>
            <Select
              id="review-method"
              value={costingMethod}
              onChange={(e) =>
                setCostingMethod(e.target.value as "weighted_average" | "fixed")
              }
              className="bg-white"
            >
              <option value="weighted_average">
                Weighted average (updates from purchases)
              </option>
              <option value="fixed">Fixed (always use default cost)</option>
            </Select>
          </div>
        </div>

        {error && (
          <div className="bg-rush-red-bg text-rush-red mt-3 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Button
            onClick={() => submit("approve")}
            disabled={loading !== null}
          >
            {loading === "approve" ? "Approving..." : "Approve"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => submit("reject")}
            disabled={loading !== null}
          >
            {loading === "reject" ? "Rejecting..." : "Reject"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
