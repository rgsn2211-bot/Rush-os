"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Purchase, PurchaseItem, InventoryItem, Supplier } from "@/types/inventory";
import { formatFils, bhdToFils, filsToBhd } from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface CostEntry {
  purchaseItemId: string;
  unitCostBhd: string;
}

interface PurchaseReviewDetailProps {
  purchase: Purchase;
  items: PurchaseItem[];
  inventoryItems: InventoryItem[];
  supplier: Supplier | null;
  submitterName: string | null;
}

export function PurchaseReviewDetail({
  purchase,
  items,
  inventoryItems,
  supplier,
  submitterName,
}: PurchaseReviewDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

  const [costs, setCosts] = useState<CostEntry[]>(
    items.map((pi) => ({
      purchaseItemId: pi.id,
      unitCostBhd: pi.unitCostFils > 0 ? filsToBhd(pi.unitCostFils).toFixed(3) : "",
    })),
  );

  function updateCost(index: number, value: string) {
    setCosts(costs.map((c, i) => (i === index ? { ...c, unitCostBhd: value } : c)));
  }

  const previewTotal = costs.reduce((sum, c, i) => {
    const pi = items[i];
    const unitFils = bhdToFils(Number(c.unitCostBhd) || 0);
    return sum + Math.round(pi.purchaseQty * unitFils);
  }, 0);

  async function handleApprove() {
    setError(null);

    const missingCost = costs.some(
      (c) => !c.unitCostBhd || Number(c.unitCostBhd) <= 0,
    );
    if (missingCost) {
      setError("Enter a cost for every item before approving.");
      return;
    }

    setLoading(true);
    const body = {
      items: costs.map((c) => ({
        purchaseItemId: c.purchaseItemId,
        unitCostFils: bhdToFils(Number(c.unitCostBhd)),
      })),
    };

    const res = await fetch(`/api/reviews/${purchase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setError("Failed to approve purchase");
      setLoading(false);
      return;
    }

    setDecision("approve");
    setLoading(false);
  }

  async function handleReject() {
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/reviews/${purchase.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setError("Failed to reject purchase");
      setLoading(false);
      return;
    }

    setDecision("reject");
    setLoading(false);
  }

  if (decision) {
    return (
      <div
        className={`mb-5 flex items-center gap-3 rounded-xl p-4 ${
          decision === "approve" ? "bg-green-50" : "bg-red-50"
        }`}
      >
        <span className="text-lg">{decision === "approve" ? "✓" : "✕"}</span>
        <div className="text-ink-2 text-sm font-semibold">
          {decision === "approve"
            ? "Approved — stock updated and costs applied."
            : "Rejected — submission voided. No stock changes."}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          onClick={() => {
            router.push("/owner/review");
            router.refresh();
          }}
        >
          Back to Review
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      {/* Submission details */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardContent>
            <h3 className="mb-3 text-[15px] font-bold">Submission</h3>
            <div className="flex flex-col gap-2.5 text-sm">
              {[
                ["Type", purchase.isPaid ? "Cash purchase" : "Supplier delivery"],
                ["Submitted by", submitterName ?? "Unknown"],
                [
                  "When",
                  new Date(purchase.createdAt).toLocaleString(),
                ],
                ["Supplier", supplier?.name ?? "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-line-2 flex justify-between border-b pb-2.5 last:border-b-0"
                >
                  <span className="text-ink-3">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Items with cost entry */}
        <Card className="p-0">
          <div className="border-line-2 border-b px-5 py-4">
            <h3 className="text-[15px] font-bold">
              Items received — enter costs
            </h3>
            <p className="text-ink-3 mt-1 text-xs">
              Set the cost per purchase unit for each item before approving.
            </p>
          </div>

          {items.map((pi, i) => {
            const inv = itemMap.get(pi.inventoryItemId);
            return (
              <div
                key={pi.id}
                className="border-line-2 border-b px-5 py-4 last:border-b-0"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-semibold">
                      {inv?.name ?? "Unknown item"}
                    </div>
                    <div className="text-ink-3 text-xs">
                      {pi.purchaseQty} {inv?.purchaseUnit ?? ""} → {pi.baseQty}{" "}
                      {inv?.baseUnit ?? ""}
                    </div>
                    {pi.expiryDate && (
                      <div className="text-ink-2 mt-1 text-xs">
                        Expires{" "}
                        <span className="font-semibold">{pi.expiryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Cost / {inv?.purchaseUnit ?? "unit"} (BHD)</Label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={costs[i].unitCostBhd}
                      placeholder="0.000"
                      onChange={(e) => updateCost(i, e.target.value)}
                      className="border-line focus:border-navy mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Line total</Label>
                    <div className="mt-1 px-3 py-2 font-mono text-sm font-semibold">
                      {formatFils(
                        Math.round(
                          pi.purchaseQty *
                            bhdToFils(Number(costs[i].unitCostBhd) || 0),
                        ),
                      )}{" "}
                      BHD
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-4">
            <span className="text-[14.5px] font-bold">Total</span>
            <span className="font-mono text-base font-bold">
              {formatFils(previewTotal)}{" "}
              <span className="text-ink-3 text-xs">BHD</span>
            </span>
          </div>
        </Card>
      </div>

      {/* Decision sidebar */}
      <Card className="lg:sticky lg:top-20">
        <CardContent>
          <h3 className="mb-1 text-[15px] font-bold">Decision</h3>
          <p className="text-ink-3 mb-5 text-xs">
            Approving updates stock quantities and weighted-average costs.
          </p>

          {error && (
            <div className="bg-rush-red-bg text-rush-red mb-4 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <Button
            full
            size="lg"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? "Processing..." : "Approve"}
          </Button>
          <Button
            variant="danger"
            full
            className="mt-2"
            onClick={handleReject}
            disabled={loading}
          >
            Reject
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
