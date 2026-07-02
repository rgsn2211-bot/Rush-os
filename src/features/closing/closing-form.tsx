"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryPlatformLite } from "@/types/delivery";
import { formatBhd } from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function int(s: string): number {
  const n = parseInt(s || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export interface ClosingFormInitial {
  discountBhd: string;
  cashSalesBhd: string;
  cashOrders: string;
  cardSalesBhd: string;
  cardOrders: string;
  benefitpaySalesBhd: string;
  benefitpayOrders: string;
  cashCountedBhd: string;
  notes: string;
  /** platform id -> { sales, orders } in BHD strings */
  delivery: Record<string, { sales: string; orders: string }>;
}

interface ClosingFormProps {
  mode: "create" | "edit";
  /** The date this closing is for (immutable; shown for context). */
  reportDate: string;
  platforms: DeliveryPlatformLite[];
  /** Existing values (edit) or prefill (create). */
  initial?: ClosingFormInitial;
  /** Required in edit mode — the closing to PUT to. */
  closingId?: string;
  onDone: () => void;
  onCancel: () => void;
}

const EMPTY: ClosingFormInitial = {
  discountBhd: "",
  cashSalesBhd: "",
  cashOrders: "",
  cardSalesBhd: "",
  cardOrders: "",
  benefitpaySalesBhd: "",
  benefitpayOrders: "",
  cashCountedBhd: "",
  notes: "",
  delivery: {},
};

export function ClosingForm({
  mode,
  reportDate,
  platforms,
  initial,
  closingId,
  onDone,
  onCancel,
}: ClosingFormProps) {
  const router = useRouter();
  const start = initial ?? EMPTY;

  const [discount, setDiscount] = useState(start.discountBhd);
  const [cashSales, setCashSales] = useState(start.cashSalesBhd);
  const [cashOrders, setCashOrders] = useState(start.cashOrders);
  const [cardSales, setCardSales] = useState(start.cardSalesBhd);
  const [cardOrders, setCardOrders] = useState(start.cardOrders);
  const [benefitpaySales, setBenefitpaySales] = useState(
    start.benefitpaySalesBhd,
  );
  const [benefitpayOrders, setBenefitpayOrders] = useState(
    start.benefitpayOrders,
  );
  const [cashCounted, setCashCounted] = useState(start.cashCountedBhd);
  const [notes, setNotes] = useState(start.notes);
  const [delivery, setDelivery] = useState<
    Record<string, { sales: string; orders: string }>
  >(start.delivery);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setDeliveryField(
    id: string,
    field: "sales" | "orders",
    value: string,
  ) {
    setDelivery((d) => {
      const cur = d[id] ?? { sales: "", orders: "" };
      return { ...d, [id]: { ...cur, [field]: value } };
    });
  }

  const deliveryTotal = platforms.reduce(
    (s, p) => s + num(delivery[p.id]?.sales ?? ""),
    0,
  );
  const grossSales =
    num(cashSales) + num(cardSales) + num(benefitpaySales) + deliveryTotal;

  async function handleSave() {
    setError(null);
    setLoading(true);

    const deliveryLines = platforms.map((p) => ({
      platformId: p.id,
      salesBhd: num(delivery[p.id]?.sales ?? ""),
      orders: int(delivery[p.id]?.orders ?? ""),
    }));

    const figures = {
      discountBhd: num(discount),
      cashSalesBhd: num(cashSales),
      cashOrders: int(cashOrders),
      cardSalesBhd: num(cardSales),
      cardOrders: int(cardOrders),
      benefitpaySalesBhd: num(benefitpaySales),
      benefitpayOrders: int(benefitpayOrders),
      deliveryLines,
      cashCountedBhd: num(cashCounted),
      notes: notes.trim() || undefined,
    };

    const res =
      mode === "create"
        ? await fetch("/api/closing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reportDate, ...figures }),
          })
        : await fetch(`/api/closing/${closingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(figures),
          });

    if (!res.ok) {
      let message = mode === "create" ? "Failed to create" : "Failed to save";
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

    setLoading(false);
    router.refresh();
    onDone();
  }

  return (
    <div className="border-line bg-bg flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <span className="text-ink text-sm font-bold">
          {mode === "create" ? "New closing" : "Edit closing"} · {reportDate}
        </span>
      </div>

      <div>
        <Label htmlFor="cf-discount" className="text-[11px]">
          Discount total (BHD)
        </Label>
        <Input
          id="cf-discount"
          type="number"
          min="0"
          step="0.001"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="0.000"
          className="font-mono"
        />
      </div>

      <div className="text-ink-3 text-xs font-semibold uppercase tracking-wide">
        Sales by payment method
      </div>
      <Row
        label="Cash"
        amount={cashSales}
        orders={cashOrders}
        onAmount={setCashSales}
        onOrders={setCashOrders}
      />
      <Row
        label="Card"
        amount={cardSales}
        orders={cardOrders}
        onAmount={setCardSales}
        onOrders={setCardOrders}
      />
      <Row
        label="BenefitPay"
        amount={benefitpaySales}
        orders={benefitpayOrders}
        onAmount={setBenefitpaySales}
        onOrders={setBenefitpayOrders}
      />

      {platforms.length > 0 && (
        <>
          <div className="text-ink-3 text-xs font-semibold uppercase tracking-wide">
            Delivery apps
          </div>
          {platforms.map((p) => (
            <Row
              key={p.id}
              label={p.name}
              amount={delivery[p.id]?.sales ?? ""}
              orders={delivery[p.id]?.orders ?? ""}
              onAmount={(v) => setDeliveryField(p.id, "sales", v)}
              onOrders={(v) => setDeliveryField(p.id, "orders", v)}
            />
          ))}
        </>
      )}

      <div>
        <Label htmlFor="cf-counted" className="text-[11px]">
          Cash counted in drawer (BHD)
        </Label>
        <Input
          id="cf-counted"
          type="number"
          min="0"
          step="0.001"
          value={cashCounted}
          onChange={(e) => setCashCounted(e.target.value)}
          placeholder="0.000"
          className="font-mono"
        />
        <p className="text-ink-3 mt-1 text-xs">
          The expected cash and variance are recomputed from the register on save.
        </p>
      </div>

      <div>
        <Label htmlFor="cf-notes" className="text-[11px]">
          Notes (optional)
        </Label>
        <Input
          id="cf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth noting…"
        />
      </div>

      <div className="bg-white text-ink-2 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
        <span className="font-semibold">Gross sales</span>
        <span className="font-mono font-bold">{formatBhd(grossSales)} BHD</span>
      </div>

      {error && (
        <div className="bg-rush-red-bg text-rush-red rounded-lg px-4 py-2.5 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={loading} full>
          {loading
            ? "Saving…"
            : mode === "create"
              ? "Create closing"
              : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  amount,
  orders,
  onAmount,
  onOrders,
}: {
  label: string;
  amount: string;
  orders: string;
  onAmount: (v: string) => void;
  onOrders: (v: string) => void;
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="text-ink w-24 shrink-0 pb-2 text-sm font-semibold">
        {label}
      </div>
      <div className="flex-1">
        <Label className="text-ink-3 mb-1 block text-[11px]">Sales (BHD)</Label>
        <Input
          type="number"
          min="0"
          step="0.001"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          placeholder="0.000"
          className="font-mono"
        />
      </div>
      <div className="w-20 shrink-0">
        <Label className="text-ink-3 mb-1 block text-[11px]">Orders</Label>
        <Input
          type="number"
          min="0"
          step="1"
          value={orders}
          onChange={(e) => onOrders(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
          className="text-center font-mono"
        />
      </div>
    </div>
  );
}
