"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyClosingWithSubmitter } from "@/types/closing";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Check, X, ClipboardList } from "lucide-react";

interface Props {
  closings: DailyClosingWithSubmitter[];
}

type Filter = "all" | "pending" | "reviewed";

export function ClosingList({ closings }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
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

              {c.status === "needs_review" && (
                <div className="mt-3 flex gap-2 pl-14">
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
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
