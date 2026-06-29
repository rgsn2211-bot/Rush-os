"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItemOps, Supplier, PurchaseMode } from "@/types/inventory";
import { bhdToFils, formatFils } from "@/lib/calculations/currency";
import { purchaseToBaseQty } from "@/lib/calculations/costing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Package, Banknote, AlertTriangle, Check } from "lucide-react";

interface ReceiveLine {
  inventoryItemId: string;
  name: string;
  purchaseUnit: string;
  baseUnit: string;
  unitsPerPurchase: number;
  basePerStock: number;
  purchaseQty: number;
  unitCostBhd: string;
  expiry: "required" | "optional" | "not_needed";
  expiryDate: string;
}

/** Suggested expiry = today + shelf-life days, as a yyyy-mm-dd string. */
function suggestExpiry(shelfLifeDays: number | null): string {
  if (!shelfLifeDays || shelfLifeDays <= 0) return "";
  const d = new Date();
  d.setDate(d.getDate() + shelfLifeDays);
  return d.toISOString().split("T")[0];
}

interface ReceiveFormProps {
  inventoryItems: InventoryItemOps[];
  suppliers: Supplier[];
}

export function ReceiveForm({ inventoryItems, suppliers }: ReceiveFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PurchaseMode>("supplier_delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const isCash = mode === "cash_purchase";

  function addLine(item: InventoryItemOps) {
    if (lines.some((l) => l.inventoryItemId === item.id)) return;
    setLines([
      ...lines,
      {
        inventoryItemId: item.id,
        name: item.name,
        purchaseUnit: item.purchaseUnit,
        baseUnit: item.baseUnit,
        unitsPerPurchase: item.unitsPerPurchase,
        basePerStock: item.basePerStock,
        purchaseQty: 1,
        unitCostBhd: "",
        expiry: item.expiry,
        expiryDate:
          item.expiry === "not_needed"
            ? ""
            : suggestExpiry(item.shelfLifeDays),
      },
    ]);
    setShowPicker(false);
  }

  function updateLine(index: number, patch: Partial<ReceiveLine>) {
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

    if (isCash && lines.some((l) => !l.unitCostBhd || Number(l.unitCostBhd) <= 0)) {
      setError("Enter cost for every item on cash purchases.");
      return;
    }

    const missingExpiry = lines.find(
      (l) => l.expiry === "required" && !l.expiryDate,
    );
    if (missingExpiry) {
      setError(`Enter an expiry date for ${missingExpiry.name}.`);
      return;
    }

    setLoading(true);

    const body = {
      supplierId: supplierId || undefined,
      purchasedOn: new Date().toISOString().split("T")[0],
      isPaid: isCash,
      mode,
      items: lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        purchaseQty: l.purchaseQty,
        unitCostFils: isCash ? bhdToFils(Number(l.unitCostBhd) || 0) : 0,
        expiryDate: l.expiryDate || undefined,
      })),
    };

    const res = await fetch("/api/worker/purchases", {
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
        // response had no JSON body
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
          {isCash ? "Cash purchase submitted" : "Delivery logged"}
        </h2>
        <p className="text-ink-2 mb-6 max-w-xs text-[14.5px] leading-relaxed">
          {isCash
            ? "Marked for owner review with cost details."
            : "The owner will review and enter costs."}
          {" "}
          {lines.length} item{lines.length > 1 ? "s" : ""} recorded.
        </p>
        <Button onClick={() => router.push("/worker")} size="lg">
          Back to Home
        </Button>
      </div>
    );
  }

  const usedIds = new Set(lines.map((l) => l.inventoryItemId));
  const availableItems = inventoryItems.filter((i) => !usedIds.has(i.id));

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      {/* Mode toggle */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("supplier_delivery")}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 font-semibold transition-colors ${
            !isCash
              ? "border-navy bg-navy text-white"
              : "border-line bg-white text-ink-2"
          }`}
        >
          <Package size={24} />
          Supplier delivery
        </button>
        <button
          type="button"
          onClick={() => setMode("cash_purchase")}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 font-semibold transition-colors ${
            isCash
              ? "border-navy bg-navy text-white"
              : "border-line bg-white text-ink-2"
          }`}
        >
          <Banknote size={24} />
          Cash purchase
        </button>
      </div>

      {isCash && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-50 p-3.5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-ink-2 text-[13.5px] leading-relaxed">
            Cash purchases are <strong>marked for owner review</strong>. Add cost
            for every item.
          </p>
        </div>
      )}

      {/* Supplier picker */}
      {!isCash && (
        <Card className="mb-4">
          <CardContent>
            <Label htmlFor="supplier">Supplier</Label>
            <Select
              id="supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      {lines.map((l, i) => {
        const baseQty = purchaseToBaseQty(
          l.purchaseQty,
          l.unitsPerPurchase,
          l.basePerStock,
        );
        return (
          <Card key={l.inventoryItemId} className="mb-3.5">
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-navy text-sm font-bold">Item {i + 1}</div>
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
                  <Label>Qty received</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="any"
                    value={l.purchaseQty}
                    onChange={(e) =>
                      updateLine(i, { purchaseQty: Number(e.target.value) || 0 })
                    }
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Purchase unit</Label>
                  <div className="border-line bg-bg flex h-10 items-center rounded-lg border px-3 text-sm font-semibold">
                    {l.purchaseUnit}
                  </div>
                </div>
              </div>

              {isCash && (
                <div className="mt-3">
                  <Label>Cost (BHD)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={l.unitCostBhd}
                    placeholder="0.000"
                    onChange={(e) => updateLine(i, { unitCostBhd: e.target.value })}
                    className="font-mono"
                  />
                </div>
              )}

              {l.expiry !== "not_needed" && (
                <div className="mt-3">
                  <Label>
                    Expiry date
                    {l.expiry === "required" ? (
                      <span className="text-rush-red"> *</span>
                    ) : (
                      <span className="text-ink-3"> (optional)</span>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={l.expiryDate}
                    onChange={(e) =>
                      updateLine(i, { expiryDate: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              )}

              <div className="text-ink-3 mt-2.5 text-xs">
                Adds {baseQty} {l.baseUnit} to stock
                {isCash && l.unitCostBhd && Number(l.unitCostBhd) > 0 && (
                  <span>
                    {" "}
                    · line total{" "}
                    {formatFils(
                      Math.round(
                        l.purchaseQty * bhdToFils(Number(l.unitCostBhd)),
                      ),
                    )}{" "}
                    BHD
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add item button / picker */}
      {showPicker ? (
        <Card className="mb-4">
          <CardContent>
            <div className="mb-2 text-sm font-semibold">Select item</div>
            {availableItems.length === 0 ? (
              <p className="text-ink-3 text-sm">
                {inventoryItems.length === 0
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

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-[22px] py-4 backdrop-blur-sm">
        <div className="mx-auto max-w-[540px]">
          {lines.length > 0 && (
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-ink-2">
                {lines.length} item{lines.length > 1 ? "s" : ""}
              </span>
              {isCash && (
                <span className="font-mono font-semibold">
                  {formatFils(
                    lines.reduce(
                      (sum, l) =>
                        sum +
                        Math.round(
                          l.purchaseQty * bhdToFils(Number(l.unitCostBhd) || 0),
                        ),
                      0,
                    ),
                  )}{" "}
                  BHD
                </span>
              )}
            </div>
          )}
          <Button type="submit" full size="lg" disabled={loading || lines.length === 0}>
            {loading
              ? "Submitting..."
              : isCash
                ? "Submit Cash Purchase"
                : "Confirm Delivery"}
          </Button>
        </div>
      </div>
    </form>
  );
}
