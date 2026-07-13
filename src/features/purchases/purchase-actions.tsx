"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpiryMode } from "@/types/inventory";
import { bhdToFils, filsToBhd, formatFils } from "@/lib/calculations/currency";
import { purchaseToBaseQty } from "@/lib/calculations/costing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ReceiveLineInput {
  purchaseItemId: string;
  name: string;
  purchaseUnit: string;
  baseUnit: string;
  unitsPerPurchase: number;
  basePerStock: number;
  expiry: ExpiryMode;
  expectedQty: number;
  expectedUnitCostFils: number;
  expiryDate: string | null;
}

interface PurchaseActionsProps {
  purchaseId: string;
  status: string;
  isPaid: boolean;
  /** Prepaid orders lock cost to what was paid — the receive form hides cost. */
  prepaid: boolean;
  lines: ReceiveLineInput[];
}

interface LineState {
  qty: number;
  unitCostBhd: string;
  expiryDate: string;
}

export function PurchaseActions({
  purchaseId,
  status,
  isPaid,
  prepaid,
  lines,
}: PurchaseActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [choosingPay, setChoosingPay] = useState(false);

  const [rows, setRows] = useState<LineState[]>(
    lines.map((l) => ({
      qty: l.expectedQty,
      unitCostBhd:
        l.expectedUnitCostFils > 0
          ? filsToBhd(l.expectedUnitCostFils).toFixed(3)
          : "",
      expiryDate: l.expiryDate ?? "",
    })),
  );

  const canReceive = status === "ordered";
  const canPay = !isPaid && status !== "voided";

  function patchRow(i: number, patch: Partial<LineState>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submitReceive() {
    setError(null);

    const missingExpiry = lines.findIndex(
      (l, i) => l.expiry === "required" && !rows[i].expiryDate,
    );
    if (missingExpiry >= 0) {
      setError(`Enter an expiry date for ${lines[missingExpiry].name}.`);
      return;
    }
    if (!prepaid && rows.some((r) => !r.unitCostBhd || Number(r.unitCostBhd) <= 0)) {
      setError("Enter the final cost for every item.");
      return;
    }

    setBusy(true);
    const res = await fetch(`/api/purchases/${purchaseId}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((l, i) => ({
          purchaseItemId: l.purchaseItemId,
          purchaseQty: rows[i].qty,
          ...(prepaid
            ? {}
            : { unitCostFils: bhdToFils(Number(rows[i].unitCostBhd) || 0) }),
          ...(rows[i].expiryDate ? { expiryDate: rows[i].expiryDate } : {}),
        })),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Failed to receive. Check the quantities and try again.");
      return;
    }
    router.refresh();
  }

  async function pay(method: "cash" | "bank") {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/money/purchases/${purchaseId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paidMethod: method }),
    });
    setBusy(false);
    setChoosingPay(false);
    if (!res.ok) {
      setError("Failed to mark paid.");
      return;
    }
    router.refresh();
  }

  if (!canReceive && !canPay) return null;

  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 text-[15px] font-bold">Actions</h3>

        {error && (
          <div className="bg-rush-red-bg text-rush-red mb-3 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {canReceive && !receiving && (
          <Button full size="lg" onClick={() => setReceiving(true)}>
            Mark received
          </Button>
        )}

        {canReceive && receiving && (
          <div className="mb-2">
            <p className="text-ink-3 mb-3 text-xs leading-relaxed">
              Enter what actually arrived
              {prepaid
                ? " — this order is prepaid, so the cost is already set."
                : " and the final cost. Stock lands on save."}
            </p>
            {lines.map((l, i) => {
              const baseQty = purchaseToBaseQty(
                rows[i].qty,
                l.unitsPerPurchase,
                l.basePerStock,
              );
              return (
                <div key={l.purchaseItemId} className="border-line-2 border-t py-3 first:border-t-0">
                  <div className="mb-2 text-sm font-semibold">{l.name}</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-xs">Qty ({l.purchaseUnit})</Label>
                      <Input
                        type="number"
                        min="0.001"
                        step="any"
                        value={rows[i].qty}
                        onChange={(e) =>
                          patchRow(i, { qty: Number(e.target.value) || 0 })
                        }
                        className="font-mono"
                      />
                    </div>
                    {!prepaid && (
                      <div>
                        <Label className="text-xs">Cost / {l.purchaseUnit} (BHD)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={rows[i].unitCostBhd}
                          placeholder="0.000"
                          onChange={(e) =>
                            patchRow(i, { unitCostBhd: e.target.value })
                          }
                          className="font-mono"
                        />
                      </div>
                    )}
                  </div>
                  {l.expiry !== "not_needed" && (
                    <div className="mt-2.5">
                      <Label className="text-xs">
                        Expiry
                        {l.expiry === "required" && (
                          <span className="text-rush-red"> *</span>
                        )}
                      </Label>
                      <Input
                        type="date"
                        value={rows[i].expiryDate}
                        onChange={(e) => patchRow(i, { expiryDate: e.target.value })}
                        className="font-mono"
                      />
                    </div>
                  )}
                  <div className="text-ink-3 mt-1.5 text-xs">
                    Adds {baseQty} {l.baseUnit} to stock
                  </div>
                </div>
              );
            })}
            <div className="mt-3 flex gap-2">
              <Button full onClick={submitReceive} disabled={busy}>
                {busy ? "Saving..." : "Confirm received"}
              </Button>
              <Button variant="ghost" onClick={() => setReceiving(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {canPay && (
          <div className={canReceive && !receiving ? "mt-2.5" : ""}>
            {!choosingPay ? (
              <Button
                variant="secondary"
                full
                size="lg"
                onClick={() => setChoosingPay(true)}
                disabled={busy}
              >
                Mark paid
              </Button>
            ) : (
              <div>
                <div className="text-ink-3 mb-1.5 text-xs">Paid from</div>
                <div className="flex gap-2">
                  <Button full onClick={() => pay("cash")} disabled={busy}>
                    Cash (Register)
                  </Button>
                  <Button full onClick={() => pay("bank")} disabled={busy}>
                    Bank
                  </Button>
                </div>
                <button
                  type="button"
                  className="text-ink-3 mt-2 text-xs font-semibold"
                  onClick={() => setChoosingPay(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {prepaid && canReceive && (
          <p className="text-ink-3 mt-3 text-xs">
            Total {formatFils(lines.reduce((s, l) => s + l.expectedUnitCostFils * l.expectedQty, 0))} already paid.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
