"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItemOps, Supplier } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, Check } from "lucide-react";

export interface OrderLine {
  purchaseItemId: string;
  name: string;
  purchaseUnit: string;
  expiry: "required" | "optional" | "not_needed";
  expectedQty: number;
  expiryDate: string | null;
}

export interface OrderRow {
  id: string;
  supplierName: string;
  purchasedOn: string;
  status: string;
  isPaid: boolean;
  dueDate: string | null;
  lines: OrderLine[];
}

const STAGE: Record<string, { label: string; variant: "default" | "amber" | "green" }> = {
  ordered: { label: "Expected", variant: "default" },
  needs_review: { label: "Awaiting owner review", variant: "amber" },
  approved: { label: "Received", variant: "green" },
};

export function OrdersView({
  orders,
  items,
  suppliers,
}: {
  orders: OrderRow[];
  items: InventoryItemOps[];
  suppliers: Supplier[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="pb-8">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : "Place order"}
        </Button>
      </div>

      {creating && (
        <NewOrderForm
          items={items}
          suppliers={suppliers}
          onDone={() => setCreating(false)}
        />
      )}

      {orders.length === 0 ? (
        <EmptyState message="No orders yet. Place an order to track an incoming delivery." />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const router = useRouter();
  const stage = STAGE[order.status] ?? { label: order.status, variant: "default" as const };
  const canReceive = order.status === "ordered";

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>(
    Object.fromEntries(order.lines.map((l) => [l.purchaseItemId, l.expectedQty])),
  );
  const [expiry, setExpiry] = useState<Record<string, string>>(
    Object.fromEntries(order.lines.map((l) => [l.purchaseItemId, l.expiryDate ?? ""])),
  );

  async function receive() {
    setError(null);
    const missing = order.lines.find(
      (l) => l.expiry === "required" && !expiry[l.purchaseItemId],
    );
    if (missing) {
      setError(`Enter an expiry date for ${missing.name}.`);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/worker/purchases/${order.id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: order.lines.map((l) => ({
          purchaseItemId: l.purchaseItemId,
          purchaseQty: qty[l.purchaseItemId] || 0,
          ...(expiry[l.purchaseItemId]
            ? { expiryDate: expiry[l.purchaseItemId] }
            : {}),
        })),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not submit. Check the quantities and try again.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold">{order.supplierName}</div>
            <div className="text-ink-3 text-[13px]">
              Ordered {order.purchasedOn} · {order.lines.length} item
              {order.lines.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={stage.variant}>{stage.label}</Badge>
            <Badge variant={order.isPaid ? "green" : "amber"}>
              {order.isPaid ? "Paid" : "Unpaid"}
            </Badge>
          </div>
        </div>

        {canReceive && !open && (
          <Button
            variant="secondary"
            full
            className="mt-3"
            onClick={() => setOpen(true)}
          >
            <Check size={16} className="mr-1.5" />
            Mark received
          </Button>
        )}

        {canReceive && open && (
          <div className="mt-3">
            <p className="text-ink-3 mb-3 text-xs leading-relaxed">
              Enter the quantity that actually arrived. The owner reviews and
              enters cost before stock updates.
            </p>
            {order.lines.map((l) => (
              <div key={l.purchaseItemId} className="border-line-2 border-t py-3 first:border-t-0">
                <div className="mb-2 text-sm font-semibold">{l.name}</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs">Qty ({l.purchaseUnit})</Label>
                    <Input
                      type="number"
                      min="0.001"
                      step="any"
                      value={qty[l.purchaseItemId]}
                      onChange={(e) =>
                        setQty({
                          ...qty,
                          [l.purchaseItemId]: Number(e.target.value) || 0,
                        })
                      }
                      className="font-mono"
                    />
                  </div>
                  {l.expiry !== "not_needed" && (
                    <div>
                      <Label className="text-xs">
                        Expiry
                        {l.expiry === "required" && (
                          <span className="text-rush-red"> *</span>
                        )}
                      </Label>
                      <Input
                        type="date"
                        value={expiry[l.purchaseItemId]}
                        onChange={(e) =>
                          setExpiry({ ...expiry, [l.purchaseItemId]: e.target.value })
                        }
                        className="font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {error && (
              <div className="bg-rush-red-bg text-rush-red mt-2 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button full onClick={receive} disabled={busy}>
                {busy ? "Submitting..." : "Submit received"}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NewLine {
  inventoryItemId: string;
  name: string;
  purchaseUnit: string;
  purchaseQty: number;
}

function NewOrderForm({
  items,
  suppliers,
  onDone,
}: {
  items: InventoryItemOps[];
  suppliers: Supplier[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<NewLine[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const usedIds = new Set(lines.map((l) => l.inventoryItemId));
  const available = items.filter((i) => !usedIds.has(i.id));

  function addLine(item: InventoryItemOps) {
    setLines([
      ...lines,
      {
        inventoryItemId: item.id,
        name: item.name,
        purchaseUnit: item.purchaseUnit,
        purchaseQty: 1,
      },
    ]);
    setShowPicker(false);
  }

  async function submit() {
    setError(null);
    if (lines.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/worker/purchases/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: supplierId || undefined,
        items: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          purchaseQty: l.purchaseQty,
        })),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not place the order. Try again.");
      return;
    }
    setDone(true);
    router.refresh();
    onDone();
  }

  if (done) return null;

  return (
    <Card className="mb-4">
      <CardContent>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Package size={18} className="text-navy" />
          New order
        </div>

        <Label htmlFor="order-supplier">Supplier</Label>
        <Select
          id="order-supplier"
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

        <div className="mt-3 flex flex-col gap-2">
          {lines.map((l, i) => (
            <div key={l.inventoryItemId} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {l.name}
              </span>
              <Input
                type="number"
                min="0.001"
                step="any"
                value={l.purchaseQty}
                onChange={(e) =>
                  setLines(
                    lines.map((x, idx) =>
                      idx === i
                        ? { ...x, purchaseQty: Number(e.target.value) || 0 }
                        : x,
                    ),
                  )
                }
                className="w-24 font-mono"
              />
              <span className="text-ink-3 w-12 text-xs">{l.purchaseUnit}</span>
              <button
                type="button"
                onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                className="text-ink-3 hover:text-rush-red text-lg"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        {showPicker ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {available.length === 0 ? (
              <p className="text-ink-3 text-sm">No more items to add.</p>
            ) : (
              available.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addLine(item)}
                  className="border-line text-navy rounded-full border bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-50"
                >
                  + {item.name}
                </button>
              ))
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            full
            className="mt-3 border-dashed"
            onClick={() => setShowPicker(true)}
          >
            + Add item
          </Button>
        )}

        {error && (
          <div className="bg-rush-red-bg text-rush-red mt-3 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <Button full size="lg" className="mt-4" onClick={submit} disabled={busy}>
          {busy ? "Placing..." : "Place Order"}
        </Button>
      </CardContent>
    </Card>
  );
}
