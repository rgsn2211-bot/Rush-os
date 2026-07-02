"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DailyClosingWithSubmitter,
  ClosingReviewDetails,
} from "@/types/closing";
import type { DeliveryPlatformLite } from "@/types/delivery";
import { formatFils, filsToBhd } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ClosingCalendar } from "@/features/closing/closing-calendar";
import { ClosingForm, type ClosingFormInitial } from "@/features/closing/closing-form";
import {
  Check,
  X,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Trash2,
  Gift,
  Banknote,
  Pencil,
} from "lucide-react";

const WASTE_REASON_LABELS: Record<string, string> = {
  spoilage: "Spoilage",
  breakage: "Breakage",
  expired: "Expired",
  training: "Training",
  other: "Other",
};

interface Props {
  closings: DailyClosingWithSubmitter[];
  platforms: DeliveryPlatformLite[];
  today: string;
}

type Filter = "all" | "pending" | "reviewed";

/** Fils -> BHD input string; blank for zero so the placeholder shows. */
function bhdStr(fils: number): string {
  return fils ? String(filsToBhd(fils)) : "";
}
function countStr(n: number): string {
  return n ? String(n) : "";
}

export function ClosingList({ closings, platforms, today }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ClosingReviewDetails>>(
    {},
  );
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);

  // Calendar-driven back-fill + editing.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const byDate = new Map(closings.map((c) => [c.reportDate, c]));

  async function ensureDetails(id: string) {
    if (details[id]) return;
    setDetailsLoadingId(id);
    const res = await fetch(`/api/closing/${id}/details`);
    if (res.ok) {
      const data: ClosingReviewDetails = await res.json();
      setDetails((d) => ({ ...d, [id]: data }));
    }
    setDetailsLoadingId(null);
  }

  async function toggleDetails(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setEditingId(null);
    setExpandedId(id);
    await ensureDetails(id);
  }

  async function startEdit(id: string) {
    setExpandedId(null);
    await ensureDetails(id);
    setEditingId(id);
  }

  function handleSelectDate(date: string | null) {
    setSelectedDate(date);
    setCreatingDate(null);
    setEditingId(null);
    if (!date) return;
    const existing = byDate.get(date);
    if (existing) {
      // Reveal that day's row for review / edit.
      setFilter("all");
      setExpandedId(existing.id);
      void ensureDetails(existing.id);
    } else {
      setCreatingDate(date);
    }
  }

  const pending = closings.filter((c) => c.status === "needs_review");
  const reviewed = closings.filter((c) => c.status !== "needs_review");

  const filtered =
    filter === "pending" ? pending : filter === "reviewed" ? reviewed : closings;

  const categories: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: closings.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "reviewed", label: "Reviewed", count: reviewed.length },
  ];

  async function handleReview(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setError(null);

    const res = await fetch(`/api/closing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Action failed");
    } else {
      // Reconciliation is re-frozen on approval — drop the cached detail.
      setDetails((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    }

    setLoadingId(null);
    router.refresh();
  }

  function statusBadge(status: string) {
    switch (status) {
      case "needs_review":
        return <Badge variant="amber">Pending</Badge>;
      case "approved":
        return <Badge variant="green">Approved</Badge>;
      case "voided":
        return <Badge variant="red">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  function variance(c: DailyClosingWithSubmitter) {
    const v = c.cashVarianceFils;
    const sign = v < 0 ? "−" : v > 0 ? "+" : "";
    return `${sign}${formatFils(Math.abs(v))} BHD`;
  }

  function editInitial(c: DailyClosingWithSubmitter): ClosingFormInitial {
    const det = details[c.id];
    const delivery: Record<string, { sales: string; orders: string }> = {};
    if (det) {
      for (const line of det.deliveryLines) {
        delivery[line.platformId] = {
          sales: bhdStr(line.salesFils),
          orders: countStr(line.orders),
        };
      }
    }
    return {
      discountBhd: bhdStr(c.discountFils),
      cashSalesBhd: bhdStr(c.cashSalesFils),
      cashOrders: countStr(c.cashOrders),
      cardSalesBhd: bhdStr(c.cardSalesFils),
      cardOrders: countStr(c.cardOrders),
      benefitpaySalesBhd: bhdStr(c.benefitpaySalesFils),
      benefitpayOrders: countStr(c.benefitpayOrders),
      cashCountedBhd: bhdStr(c.cashCountedFils),
      notes: c.notes ?? "",
      delivery,
    };
  }

  return (
    <div>
      <ClosingCalendar
        closings={closings.map((c) => ({
          reportDate: c.reportDate,
          status: c.status,
        }))}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        today={today}
      />

      {creatingDate && (
        <div className="mb-5">
          <ClosingForm
            mode="create"
            reportDate={creatingDate}
            platforms={platforms}
            onDone={() => {
              setCreatingDate(null);
              setSelectedDate(null);
            }}
            onCancel={() => {
              setCreatingDate(null);
              setSelectedDate(null);
            }}
          />
        </div>
      )}

      <div className="mb-5 grid grid-cols-3 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${
              filter === cat.key ? "border-navy bg-white" : "border-line bg-white"
            }`}
          >
            <div
              className={`font-mono text-xl font-bold ${
                cat.count > 0 ? "text-navy" : "text-ink-3"
              }`}
            >
              {cat.count}
            </div>
            <div className="text-ink-2 mt-1 text-xs font-semibold">
              {cat.label}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="No daily closings in this group." />
      ) : (
        <Card className="p-0">
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`px-5 py-4 ${i > 0 ? "border-line-2 border-t" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <ClipboardList size={20} className="text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold">{c.reportDate}</span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="text-ink-2 mt-0.5 text-[13px]">
                    {c.submitterName ?? "Unknown"} · {c.totalOrders} orders ·{" "}
                    {formatFils(c.grossSalesFils)} BHD gross
                  </div>
                  <div className="text-ink-3 mt-0.5 text-[13px]">
                    Cash counted {formatFils(c.cashCountedFils)} · diff{" "}
                    <span
                      className={
                        c.cashVarianceFils === 0
                          ? "text-ink-2"
                          : "text-rush-red"
                      }
                    >
                      {variance(c)}
                    </span>
                    {c.notes && ` · ${c.notes}`}
                  </div>
                </div>
              </div>

              {editingId === c.id ? (
                <div className="mt-3 pl-14">
                  {detailsLoadingId === c.id && !details[c.id] ? (
                    <div className="text-ink-3 text-sm">Loading…</div>
                  ) : (
                    <ClosingForm
                      mode="edit"
                      reportDate={c.reportDate}
                      closingId={c.id}
                      platforms={platforms}
                      initial={editInitial(c)}
                      onDone={() => {
                        setEditingId(null);
                        // Figures + reconciliation changed — drop cached detail.
                        setDetails((d) => {
                          const next = { ...d };
                          delete next[c.id];
                          return next;
                        });
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-2 pl-14">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => toggleDetails(c.id)}
                    >
                      {expandedId === c.id ? (
                        <ChevronUp size={14} className="mr-1" />
                      ) : (
                        <ChevronDown size={14} className="mr-1" />
                      )}
                      Details
                    </Button>
                    {c.status !== "voided" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(c.id)}
                      >
                        <Pencil size={14} className="mr-1" />
                        Edit
                      </Button>
                    )}
                    {c.status === "needs_review" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleReview(c.id, "approve")}
                          disabled={loadingId === c.id}
                        >
                          <Check size={14} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleReview(c.id, "reject")}
                          disabled={loadingId === c.id}
                          className="text-rush-red"
                        >
                          <X size={14} className="mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>

                  {expandedId === c.id && (
                    <div className="mt-3 pl-14">
                      {detailsLoadingId === c.id && !details[c.id] ? (
                        <div className="text-ink-3 text-sm">
                          Loading details…
                        </div>
                      ) : details[c.id] ? (
                        <ClosingDetails data={details[c.id]} closing={c} />
                      ) : (
                        <div className="text-ink-3 text-sm">
                          Could not load details.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function signed(fils: number): string {
  const sign = fils < 0 ? "−" : "";
  return `${sign}${formatFils(Math.abs(fils))}`;
}

function ClosingDetails({
  data,
  closing,
}: {
  data: ClosingReviewDetails;
  closing: DailyClosingWithSubmitter;
}) {
  const methods: { label: string; sales: number; orders: number }[] = [
    { label: "Cash", sales: closing.cashSalesFils, orders: closing.cashOrders },
    { label: "Card", sales: closing.cardSalesFils, orders: closing.cardOrders },
    {
      label: "BenefitPay",
      sales: closing.benefitpaySalesFils,
      orders: closing.benefitpayOrders,
    },
  ];

  return (
    <div className="border-line bg-bg flex flex-col gap-4 rounded-xl border p-4 text-sm">
      {/* Payment breakdown */}
      <Section title="Sales by payment method">
        {methods.map((m) => (
          <Row key={m.label} label={`${m.label} · ${m.orders} orders`}>
            {formatFils(m.sales)} BHD
          </Row>
        ))}
        {data.deliveryLines.map((d) => (
          <Row
            key={d.platformId}
            label={`${d.platformName ?? "Delivery"} · ${d.orders} orders`}
          >
            {formatFils(d.salesFils)} BHD
          </Row>
        ))}
        {closing.discountFils > 0 && (
          <Row label="Discounts">{formatFils(closing.discountFils)} BHD</Row>
        )}
      </Section>

      {/* Cash drawer reconciliation */}
      <Section title="Cash drawer">
        <Row label="Register cash carried over">
          {formatFils(data.openingRegisterFils)} BHD
        </Row>
        <Row label="+ Cash sales today">
          {formatFils(data.cashSalesFils)} BHD
        </Row>
        <Row label="− Cash out today (purchases + withdrawals)">
          −{formatFils(data.cashOutTodayFils)} BHD
        </Row>
        <Row label="Expected in drawer" strong>
          {formatFils(data.cashExpectedFils)} BHD
        </Row>
        <Row label="Counted">{formatFils(data.cashCountedFils)} BHD</Row>
        <Row
          label="Difference"
          valueClass={
            data.cashVarianceFils === 0 ? "text-green-600" : "text-rush-red"
          }
          strong
        >
          {signed(data.cashVarianceFils)} BHD
        </Row>
      </Section>

      {/* Cash that left the register */}
      {(data.cashOuts.length > 0 || data.cashPurchases.length > 0) && (
        <Section title="Cash out of register today">
          {data.cashPurchases.map((p) => (
            <Row
              key={p.id}
              label={
                <span className="flex items-center gap-1.5">
                  <Banknote size={13} className="text-ink-3" />
                  Cash purchase
                  {p.status === "needs_review" && (
                    <Badge variant="amber">Pending</Badge>
                  )}
                </span>
              }
            >
              −{formatFils(p.totalFils)} BHD
            </Row>
          ))}
          {data.cashOuts.map((c) => (
            <Row
              key={c.id}
              label={
                <span className="flex items-center gap-1.5">
                  <Banknote size={13} className="text-ink-3" />
                  {c.kind === "purchase" ? "Purchase" : "Withdrawal"}: {c.reason}
                  {c.status === "needs_review" && (
                    <Badge variant="amber">Pending</Badge>
                  )}
                </span>
              }
            >
              −{formatFils(c.amountFils)} BHD
            </Row>
          ))}
        </Section>
      )}

      {/* Waste */}
      <Section title={`Waste (${data.waste.length})`}>
        {data.waste.length === 0 ? (
          <div className="text-ink-3">No waste logged today.</div>
        ) : (
          data.waste.map((w) => (
            <Row
              key={w.id}
              label={
                <span className="flex items-center gap-1.5">
                  <Trash2 size={13} className="text-rush-red" />
                  {w.itemName ?? "Item"} ·{" "}
                  {w.baseQty / (w.basePerStock || 1)} {w.stockUnit ?? ""} ·{" "}
                  {WASTE_REASON_LABELS[w.reason] ?? w.reason}
                  {w.status === "needs_review" && (
                    <Badge variant="amber">Pending</Badge>
                  )}
                </span>
              }
            >
              {w.status === "approved" ? `${formatFils(w.valueFils)} BHD` : ""}
            </Row>
          ))
        )}
      </Section>

      {/* Complimentary */}
      <Section title={`Complimentary (${data.complimentary.length})`}>
        {data.complimentary.length === 0 ? (
          <div className="text-ink-3">No complimentary items today.</div>
        ) : (
          data.complimentary.map((comp) => (
            <Row
              key={comp.id}
              label={
                <span className="flex items-center gap-1.5">
                  <Gift size={13} className="text-navy" />
                  {comp.description} · {comp.reason}
                  {comp.status === "needs_review" && (
                    <Badge variant="amber">Pending</Badge>
                  )}
                </span>
              }
            >
              {formatFils(comp.amountFils)} BHD
            </Row>
          ))
        )}
        {data.complimentary.length > 0 && (
          <p className="text-ink-3 mt-1 text-xs">
            Complimentary items don&apos;t deduct inventory here — they&apos;re
            already in the POS Sales by Item upload.
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-ink-3 mb-1.5 text-xs font-bold tracking-wider uppercase">
        {title}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
  strong,
  valueClass,
}: {
  label: React.ReactNode;
  children?: React.ReactNode;
  strong?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        strong ? "border-line-2 border-t pt-1.5 font-semibold" : ""
      }`}
    >
      <span className="text-ink-2">{label}</span>
      <span
        className={`shrink-0 font-mono ${valueClass ?? "text-ink"} ${
          strong ? "font-bold" : ""
        }`}
      >
        {children}
      </span>
    </div>
  );
}
