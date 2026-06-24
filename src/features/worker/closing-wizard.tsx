"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewStatus } from "@/types/inventory";
import { formatBhd } from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ClipboardList } from "lucide-react";

const STEPS = ["EOD Numbers", "Cash Count", "Review & Submit"];

// Bahraini cash denominations, in BHD.
const DENOMS = [20, 10, 5, 1, 0.5, 0.1];
const DENOM_LABELS: Record<string, string> = {
  "20": "20 BD",
  "10": "10 BD",
  "5": "5 BD",
  "1": "1 BD",
  "0.5": "500 fils",
  "0.1": "100 fils",
};

interface ClosingWizardProps {
  today: string;
  existingStatus: ReviewStatus | null;
}

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function ClosingWizard({ today, existingStatus }: ClosingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [totalOrders, setTotalOrders] = useState("");
  const [discount, setDiscount] = useState("");
  const [cashSales, setCashSales] = useState("");
  const [cardSales, setCardSales] = useState("");
  const [benefitpaySales, setBenefitpaySales] = useState("");
  const [deliverySales, setDeliverySales] = useState("");
  const [notes, setNotes] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});

  const grossSales =
    num(cashSales) + num(cardSales) + num(benefitpaySales) + num(deliverySales);
  const countedTotal = DENOMS.reduce(
    (s, d) => s + d * (parseInt(counts[String(d)] || "0", 10) || 0),
    0,
  );
  const expectedCash = num(cashSales);
  const diff = countedTotal - expectedCash;

  if (existingStatus && !done) {
    const label =
      existingStatus === "approved"
        ? "approved by the owner"
        : "submitted and waiting for owner review";
    return (
      <Card>
        <CardContent>
          <p className="text-ink text-[15px] font-semibold">
            Today&apos;s closing is already {label}.
          </p>
          <p className="text-ink-3 mt-1 text-sm">
            Only one closing can be submitted per day.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <Check size={40} className="text-green-600" strokeWidth={2.4} />
        </div>
        <div className="text-ink text-xl font-bold">
          Daily closing submitted
        </div>
        <p className="text-ink-3 mx-auto mt-2 max-w-sm text-sm">
          {today} has been sent to the owner for review. The dashboard will
          update with today&apos;s figures once approved.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-6"
          onClick={() => router.push("/worker")}
        >
          Back to Home
        </Button>
      </div>
    );
  }

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/worker/closing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportDate: today,
        totalOrders: parseInt(totalOrders || "0", 10) || 0,
        discountBhd: num(discount),
        cashSalesBhd: num(cashSales),
        cardSalesBhd: num(cardSales),
        benefitpaySalesBhd: num(benefitpaySales),
        deliverySalesBhd: num(deliverySales),
        cashCountedBhd: countedTotal,
        notes: notes.trim() || undefined,
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

    setLoading(false);
    setDone(true);
    router.refresh();
  }

  return (
    <div className="pb-28">
      {/* Progress */}
      <div className="mb-4 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-navy" : "bg-line"
            }`}
          />
        ))}
      </div>
      <div className="text-ink-3 mb-4 text-[13px] font-semibold">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </div>

      {step === 0 && (
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="orders">Total orders</Label>
                <Input
                  id="orders"
                  type="number"
                  min="0"
                  step="1"
                  value={totalOrders}
                  onChange={(e) => setTotalOrders(e.target.value)}
                  placeholder="0"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="discount">Discount total (BHD)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.001"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.000"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="cash">Cash sales (BHD)</Label>
                <Input
                  id="cash"
                  type="number"
                  min="0"
                  step="0.001"
                  value={cashSales}
                  onChange={(e) => setCashSales(e.target.value)}
                  placeholder="0.000"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="card">Card sales (BHD)</Label>
                <Input
                  id="card"
                  type="number"
                  min="0"
                  step="0.001"
                  value={cardSales}
                  onChange={(e) => setCardSales(e.target.value)}
                  placeholder="0.000"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="benefitpay">BenefitPay sales (BHD)</Label>
                <Input
                  id="benefitpay"
                  type="number"
                  min="0"
                  step="0.001"
                  value={benefitpaySales}
                  onChange={(e) => setBenefitpaySales(e.target.value)}
                  placeholder="0.000"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="delivery">Delivery apps sales (BHD)</Label>
                <Input
                  id="delivery"
                  type="number"
                  min="0"
                  step="0.001"
                  value={deliverySales}
                  onChange={(e) => setDeliverySales(e.target.value)}
                  placeholder="0.000"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="bg-bg text-ink-2 mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm">
              <span className="font-semibold">Gross sales</span>
              <span className="font-mono font-bold">
                {formatBhd(grossSales)} BHD
              </span>
            </div>
            <p className="text-ink-3 mt-3 text-xs leading-relaxed">
              Delivery commissions and fees are reconciled monthly by the owner —
              enter only the platform sales total here.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <>
          <Card>
            <CardContent>
              <Label className="mb-2 block">Count the cash drawer</Label>
              {DENOMS.map((d, i) => (
                <div
                  key={d}
                  className={`flex items-center gap-3 py-2.5 ${
                    i > 0 ? "border-line-2 border-t" : ""
                  }`}
                >
                  <div className="text-ink w-24 text-sm font-semibold">
                    {DENOM_LABELS[String(d)]}
                  </div>
                  <span className="text-ink-3">×</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={counts[String(d)] || ""}
                    onChange={(e) =>
                      setCounts({
                        ...counts,
                        [String(d)]: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="0"
                    className="w-24 text-center font-mono"
                  />
                  <div className="text-ink-2 flex-1 text-right font-mono text-sm font-semibold">
                    {formatBhd(d * (parseInt(counts[String(d)] || "0", 10) || 0))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Counted", countedTotal, "text-ink"],
              ["Expected", expectedCash, "text-ink-2"],
              [
                "Difference",
                diff,
                Math.abs(diff) < 0.001 ? "text-green-600" : "text-rush-red",
              ],
            ].map(([label, value, color]) => (
              <Card key={label as string} className="text-center">
                <CardContent>
                  <div className="text-ink-3 mb-1 text-xs">
                    {label as string}
                  </div>
                  <div className={`font-mono text-lg font-bold ${color}`}>
                    {((value as number) < 0 ? "−" : "") +
                      formatBhd(Math.abs(value as number))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-ink-3 mt-3 text-xs leading-relaxed">
            Expected cash is today&apos;s cash sales. The owner reviews any
            difference.
          </p>
        </>
      )}

      {step === 2 && (
        <Card>
          <CardContent>
            <Label htmlFor="notes" className="mb-3 block">
              Notes (optional)
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the owner should know..."
            />
            <div className="mt-5">
              {(
                [
                  ["Date", today],
                  ["Total orders", totalOrders || "0"],
                  ["Gross sales", `${formatBhd(grossSales)} BHD`],
                  ["Discount", `${formatBhd(num(discount))} BHD`],
                  ["Cash counted", `${formatBhd(countedTotal)} BHD`],
                  [
                    "Cash difference",
                    `${diff < 0 ? "−" : ""}${formatBhd(Math.abs(diff))} BHD`,
                  ],
                ] as [string, string][]
              ).map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex justify-between py-3 ${
                    i > 0 ? "border-line-2 border-t" : ""
                  }`}
                >
                  <span className="text-ink-2 text-sm">{label}</span>
                  <span className="text-ink font-mono text-sm font-semibold">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-rush-red-bg text-rush-red mt-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Sticky footer nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-[22px] py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[540px] gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={prev}
            disabled={step === 0 || loading}
            className="min-w-[110px]"
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="lg" full onClick={next}>
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              full
              onClick={handleSubmit}
              disabled={loading}
            >
              <ClipboardList size={18} className="mr-1.5" />
              {loading ? "Submitting..." : "Submit Daily Closing"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
