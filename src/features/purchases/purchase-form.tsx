"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItem, Supplier } from "@/types/inventory";
import { formatFils, bhdToFils } from "@/lib/calculations/currency";
import { purchaseToBaseQty } from "@/lib/calculations/costing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface PurchaseLine {
  inventoryItemId: string;
  name: string;
  purchaseUnit: string;
  baseUnit: string;
  unitsPerPurchase: number;
  basePerStock: number;
  purchaseQty: number;
  unitCostBhd: string;
}

interface PurchaseFormProps {
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
}

export function PurchaseForm({ inventoryItems, suppliers }: PurchaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [supplierId, setSupplierId] = useState("");
  const [purchasedOn, setPurchasedOn] = useState(today);
  const [isPaid, setIsPaid] = useState(true);
  const [paidMethod, setPaidMethod] = useState<"cash" | "bank">("cash");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(false);

  function lineTotalFils(line: PurchaseLine): number {
    return Math.round(line.purchaseQty * bhdToFils(Number(line.unitCostBhd) || 0));
  }

  const totalFils = lines.reduce((sum, l) => sum + lineTotalFils(l), 0);

  function addLine(item: InventoryItem) {
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
      },
    ]);
    setShowItemPicker(false);
  }

  function updateLine(index: number, patch: Partial<PurchaseLine>) {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError("Add at least one item to receive.");
      return;
    }

    setLoading(true);

    const body = {
      supplierId: supplierId || undefined,
      purchasedOn: purchasedOn || undefined,
      isPaid,
      paidMethod: isPaid ? paidMethod : undefined,
      dueDate: !isPaid && dueDate ? dueDate : undefined,
      items: lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        purchaseQty: l.purchaseQty,
        unitCostFils: bhdToFils(Number(l.unitCostBhd) || 0),
      })),
    };

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] || "Failed to record purchase");
      setLoading(false);
      return;
    }

    router.push("/owner/purchases");
    router.refresh();
  }

  const usedIds = new Set(lines.map((l) => l.inventoryItemId));
  const availableItems = inventoryItems.filter((i) => !usedIds.has(i.id));

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Purchase details */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Purchase details
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    id="supplier"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchasedOn">Purchase date</Label>
                  <Input
                    id="purchasedOn"
                    type="date"
                    value={purchasedOn}
                    onChange={(e) => setPurchasedOn(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-line-2 mt-4 flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-sm font-semibold">Paid now</div>
                  <div className="text-ink-3 text-xs">
                    Turn off to track as a payable
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`h-6 w-11 rounded-full transition-colors ${isPaid ? "bg-navy" : "bg-line"}`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${isPaid ? "translate-x-[22px]" : "translate-x-0.5"}`}
                  />
                </button>
              </div>

              {isPaid && (
                <div className="mt-3">
                  <Label>Paid from</Label>
                  <div className="flex gap-2">
                    {(["cash", "bank"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaidMethod(m)}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                          paidMethod === m
                            ? "border-navy bg-navy/5 text-navy"
                            : "border-line text-ink-3 hover:text-ink"
                        }`}
                      >
                        {m === "cash" ? "Cash (Register)" : "Bank"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isPaid && (
                <div className="mt-3">
                  <Label htmlFor="dueDate">Payment due date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="p-0">
            <div className="border-line-2 flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-bold">Items received</h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowItemPicker(!showItemPicker)}
              >
                + Add item
              </Button>
            </div>

            {showItemPicker && (
              <div className="bg-bg border-line-2 flex flex-wrap gap-2 border-b px-5 py-3">
                {availableItems.length === 0 ? (
                  <p className="text-ink-3 text-sm">
                    {inventoryItems.length === 0
                      ? "Add inventory items first."
                      : "All items are already on this purchase."}
                  </p>
                ) : (
                  availableItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addLine(item)}
                      className="border-line text-navy cursor-pointer rounded-full border bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-50"
                    >
                      + {item.name}
                    </button>
                  ))
                )}
              </div>
            )}

            {lines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-line-2 border-b">
                      <th className="text-ink-3 px-5 py-2.5 text-left text-xs font-semibold uppercase">
                        Item
                      </th>
                      <th className="text-ink-3 px-3 py-2.5 text-right text-xs font-semibold uppercase">
                        Qty
                      </th>
                      <th className="text-ink-3 px-3 py-2.5 text-right text-xs font-semibold uppercase">
                        Cost / unit
                      </th>
                      <th className="text-ink-3 px-3 py-2.5 text-right text-xs font-semibold uppercase">
                        Adds to stock
                      </th>
                      <th className="text-ink-3 px-5 py-2.5 text-right text-xs font-semibold uppercase">
                        Line total
                      </th>
                      <th className="w-10 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const baseQty = purchaseToBaseQty(
                        l.purchaseQty,
                        l.unitsPerPurchase,
                        l.basePerStock,
                      );
                      return (
                        <tr
                          key={l.inventoryItemId}
                          className="border-line-2 border-b"
                        >
                          <td className="px-5 py-3">
                            <div className="font-semibold">{l.name}</div>
                            <div className="text-ink-3 text-xs">
                              per {l.purchaseUnit}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={l.purchaseQty}
                              onChange={(e) =>
                                updateLine(i, {
                                  purchaseQty: Number(e.target.value) || 0,
                                })
                              }
                              className="border-line focus:border-navy w-16 rounded-lg border px-2 py-1.5 text-right font-mono text-[13px] outline-none"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={l.unitCostBhd}
                              placeholder="0.000"
                              onChange={(e) =>
                                updateLine(i, { unitCostBhd: e.target.value })
                              }
                              className="border-line focus:border-navy w-20 rounded-lg border px-2 py-1.5 text-right font-mono text-[13px] outline-none"
                            />
                          </td>
                          <td className="text-ink-2 px-3 py-3 text-right font-mono text-[13px]">
                            {baseQty} {l.baseUnit}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold">
                            {formatFils(lineTotalFils(l))}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="text-ink-3 hover:text-rush-red text-lg"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-ink-3 px-5 py-8 text-center text-sm">
                No items yet. Use &ldquo;Add item&rdquo; to start.
              </div>
            )}

            <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-4">
              <span className="text-[14.5px] font-bold">Purchase total</span>
              <span className="font-mono text-base font-bold">
                {formatFils(totalFils)}{" "}
                <span className="text-ink-3 text-xs">BHD</span>
              </span>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-2 text-[15px] font-bold">Record purchase</h3>
            <p className="text-ink-3 mb-4 text-[13px] leading-relaxed">
              Receiving stock updates each item&rsquo;s on-hand quantity and its
              weighted-average cost.
            </p>

            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Items</span>
                <span className="font-semibold">{lines.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Total</span>
                <span className="font-mono font-semibold">
                  {formatFils(totalFils)}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-rush-red-bg text-rush-red mt-4 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" full size="lg" className="mt-5" disabled={loading}>
              {loading ? "Recording..." : "Record Purchase"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              full
              className="mt-2"
              onClick={() => router.push("/owner/purchases")}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
