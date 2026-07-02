"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryPlatformLite } from "@/types/delivery";
import { formatBhd, formatFils } from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClosingCalendar } from "@/features/closing/closing-calendar";
import {
  Check,
  ClipboardList,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  CalendarDays,
} from "lucide-react";

const STEPS = [
  "Date",
  "EOD Numbers",
  "Sales by Item",
  "Cash Count",
  "Review & Submit",
];

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
  /** Dates that already have a non-voided closing — not selectable. */
  closedDates: string[];
  platforms: DeliveryPlatformLite[];
  /** Current system register cash (fils) — shown for reference during the count. */
  registerCashFils: number;
}

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function int(s: string): number {
  const n = parseInt(s || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

interface UploadSummary {
  status: string;
  reportDate?: string;
  rowCount: number;
  mappedCount: number;
  unmappedCount: number;
  needsReviewCount: number;
}

export function ClosingWizard({
  today,
  closedDates,
  platforms,
  registerCashFils,
}: ClosingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Default to today; the worker can pick a past day to back-fill a missed one.
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const [discount, setDiscount] = useState("");
  const [cashSales, setCashSales] = useState("");
  const [cashOrders, setCashOrders] = useState("");
  const [cardSales, setCardSales] = useState("");
  const [cardOrders, setCardOrders] = useState("");
  const [benefitpaySales, setBenefitpaySales] = useState("");
  const [benefitpayOrders, setBenefitpayOrders] = useState("");
  // platform id -> { sales, orders } as strings
  const [delivery, setDelivery] = useState<
    Record<string, { sales: string; orders: string }>
  >({});
  const [notes, setNotes] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});

  // POS upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

  const closedDateSet = new Set(closedDates);
  const isSelectedClosed =
    selectedDate !== null && closedDateSet.has(selectedDate);
  const dateReady = selectedDate !== null && !isSelectedClosed;

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
  const deliveryOrders = platforms.reduce(
    (s, p) => s + int(delivery[p.id]?.orders ?? ""),
    0,
  );
  const grossSales =
    num(cashSales) + num(cardSales) + num(benefitpaySales) + deliveryTotal;
  const totalOrders =
    int(cashOrders) + int(cardOrders) + int(benefitpayOrders) + deliveryOrders;
  const countedTotal = DENOMS.reduce(
    (s, d) => s + d * (parseInt(counts[String(d)] || "0", 10) || 0),
    0,
  );

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
          {selectedDate} has been sent to the owner for review. The dashboard
          will update with the day&apos;s figures once approved.
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedDate) return;
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `/api/worker/closing/pos-upload?expectedDate=${selectedDate}`,
      { method: "POST", body: formData },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setUploadError(
        typeof data.error === "string" ? data.error : "Upload failed",
      );
    } else {
      setUploadSummary(await res.json());
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleSubmit() {
    if (!selectedDate) return;
    setError(null);
    setLoading(true);

    const deliveryLines = platforms.map((p) => ({
      platformId: p.id,
      salesBhd: num(delivery[p.id]?.sales ?? ""),
      orders: int(delivery[p.id]?.orders ?? ""),
    }));

    const res = await fetch("/api/worker/closing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportDate: selectedDate,
        discountBhd: num(discount),
        cashSalesBhd: num(cashSales),
        cashOrders: int(cashOrders),
        cardSalesBhd: num(cardSales),
        cardOrders: int(cardOrders),
        benefitpaySalesBhd: num(benefitpaySales),
        benefitpayOrders: int(benefitpayOrders),
        deliveryLines,
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
            <div className="mb-1 flex items-center gap-2">
              <CalendarDays size={18} className="text-navy" />
              <span className="text-ink text-[15px] font-bold">
                Which day are you closing?
              </span>
            </div>
            <p className="text-ink-3 mb-4 text-sm">
              Defaults to today. Pick an earlier day to make up a closing that
              was missed. Days already closed and future days can&apos;t be
              selected.
            </p>

            <ClosingCalendar
              closings={closedDates.map((d) => ({ reportDate: d }))}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              today={today}
            />

            <div className="bg-bg text-ink-2 flex items-center justify-between rounded-xl px-4 py-3 text-sm">
              <span className="font-semibold">Closing date</span>
              <span className="font-mono font-bold">
                {selectedDate ?? "— pick a date —"}
              </span>
            </div>

            {isSelectedClosed && (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                <p className="text-ink-2 text-sm">
                  This day is already closed. Pick a different day.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardContent>
            <div className="mb-3">
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

            <div className="text-ink-3 mb-2 mt-4 text-xs font-semibold uppercase tracking-wide">
              Sales by payment method
            </div>
            <MethodRow
              label="Cash"
              amount={cashSales}
              orders={cashOrders}
              onAmount={setCashSales}
              onOrders={setCashOrders}
            />
            <MethodRow
              label="Card"
              amount={cardSales}
              orders={cardOrders}
              onAmount={setCardSales}
              onOrders={setCardOrders}
            />
            <MethodRow
              label="BenefitPay"
              amount={benefitpaySales}
              orders={benefitpayOrders}
              onAmount={setBenefitpaySales}
              onOrders={setBenefitpayOrders}
            />

            {platforms.length > 0 && (
              <>
                <div className="text-ink-3 mb-2 mt-5 text-xs font-semibold uppercase tracking-wide">
                  Delivery apps
                </div>
                {platforms.map((p) => (
                  <MethodRow
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

            <div className="bg-bg text-ink-2 mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm">
              <span className="font-semibold">
                Gross sales · {totalOrders} orders
              </span>
              <span className="font-mono font-bold">
                {formatBhd(grossSales)} BHD
              </span>
            </div>
            <p className="text-ink-3 mt-3 text-xs leading-relaxed">
              Enter each platform&apos;s sales total and order count. The owner
              applies commissions per platform on the Delivery Apps page.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent>
            <div className="mb-1 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-navy" />
              <span className="text-ink text-[15px] font-bold">
                Sales by Item (optional)
              </span>
            </div>
            <p className="text-ink-3 mb-4 text-sm">
              Upload the day&apos;s Sales By Item XLSX export so inventory usage
              and COGS are recorded. You can skip this and continue.
            </p>

            {uploadSummary ? (
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <Check size={18} className="mt-0.5 shrink-0 text-green-600" />
                <div className="text-sm">
                  <div className="font-semibold text-green-700">
                    Uploaded for {uploadSummary.reportDate ?? selectedDate}
                  </div>
                  <p className="text-ink-2 mt-0.5">
                    {uploadSummary.rowCount} items · status{" "}
                    {uploadSummary.status}
                    {uploadSummary.unmappedCount > 0 &&
                      ` · ${uploadSummary.unmappedCount} need owner mapping`}
                  </p>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-6 py-8 transition-colors hover:border-gray-300">
                <Upload size={32} className="text-ink-3" strokeWidth={1.5} />
                <div className="text-center">
                  <div className="text-sm font-semibold">
                    {uploading ? "Uploading..." : "Upload Sales By Item XLSX"}
                  </div>
                  <div className="text-ink-3 mt-1 text-xs">
                    File date must match {selectedDate}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}

            {uploadError && (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle
                  size={18}
                  className="text-rush-red mt-0.5 shrink-0"
                />
                <div>
                  <div className="text-rush-red text-sm font-semibold">
                    Upload failed
                  </div>
                  <p className="text-ink-2 mt-0.5 text-sm">{uploadError}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
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
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Card className="text-center">
              <CardContent>
                <div className="text-ink-3 mb-1 text-xs">Counted</div>
                <div className="text-ink font-mono text-lg font-bold">
                  {formatBhd(countedTotal)}
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent>
                <div className="text-ink-3 mb-1 text-xs">
                  Register (system)
                </div>
                <div className="text-ink-2 font-mono text-lg font-bold">
                  {formatFils(registerCashFils)}
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-ink-3 mt-3 text-xs leading-relaxed">
            Count the drawer as it is. The owner reconciles your count against
            the register — carried-over cash plus today&apos;s cash sales, minus
            cash purchases and withdrawals.
          </p>
        </>
      )}

      {step === 4 && (
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
                  ["Date", selectedDate ?? "—"],
                  ["Total orders", String(totalOrders)],
                  ["Gross sales", `${formatBhd(grossSales)} BHD`],
                  ["Delivery sales", `${formatBhd(deliveryTotal)} BHD`],
                  ["Discount", `${formatBhd(num(discount))} BHD`],
                  ["Cash counted", `${formatBhd(countedTotal)} BHD`],
                  [
                    "Sales by Item",
                    uploadSummary ? "Uploaded" : "Not uploaded",
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
            <Button
              variant="primary"
              size="lg"
              full
              onClick={next}
              disabled={step === 0 && !dateReady}
            >
              {step === 2 && !uploadSummary ? "Skip / Continue" : "Continue"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              full
              onClick={handleSubmit}
              disabled={loading || !dateReady}
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

function MethodRow({
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
    <div className="border-line-2 flex items-end gap-3 border-t py-2.5 first:border-t-0">
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
      <div className="w-24 shrink-0">
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
