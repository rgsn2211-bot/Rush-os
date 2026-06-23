"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ComplimentaryLogWithSubmitter } from "@/types/pos";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Check, X, Gift } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  customer_remake: "Customer remake",
  staff: "Staff",
  influencer: "Influencer",
  quality_check: "Quality check",
  customer_goodwill: "Customer goodwill",
  loyalty: "Loyalty",
  other: "Other",
};

interface Props {
  logs: ComplimentaryLogWithSubmitter[];
}

type Filter = "all" | "pending" | "reviewed";

export function ComplimentaryList({ logs }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = logs.filter((l) => l.status === "needs_review");
  const reviewed = logs.filter((l) => l.status !== "needs_review");

  const filtered =
    filter === "pending"
      ? pending
      : filter === "reviewed"
        ? reviewed
        : logs;

  const totalFils = logs.reduce((s, l) => s + l.amountFils, 0);

  const categories: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: logs.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "reviewed", label: "Reviewed", count: reviewed.length },
  ];

  async function handleReview(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setError(null);

    const res = await fetch(`/api/complimentary/${id}`, {
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

  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${
              filter === c.key
                ? "border-navy bg-white"
                : "border-line bg-white"
            }`}
          >
            <div
              className={`font-mono text-xl font-bold ${
                c.count > 0 ? "text-navy" : "text-ink-3"
              }`}
            >
              {c.count}
            </div>
            <div className="text-ink-2 mt-1 text-xs font-semibold">
              {c.label}
            </div>
          </button>
        ))}
      </div>

      {totalFils > 0 && (
        <div className="text-ink-3 mb-4 text-sm">
          Total complimentary value:{" "}
          <strong className="text-ink">{formatFils(totalFils)} BHD</strong>
        </div>
      )}

      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="No complimentary logs in this group." />
      ) : (
        <Card className="p-0">
          {filtered.map((log, i) => (
            <div
              key={log.id}
              className={`px-5 py-4 ${
                i > 0 ? "border-line-2 border-t" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                  <Gift size={20} className="text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold">
                      {log.description}
                    </span>
                    {statusBadge(log.status)}
                  </div>
                  <div className="text-ink-2 mt-0.5 text-[13px]">
                    {log.submitterName ?? "Unknown"} ·{" "}
                    {new Date(log.createdAt).toLocaleDateString()} ·{" "}
                    {formatFils(log.amountFils)} BHD ·{" "}
                    {REASON_LABELS[log.reason] || log.reason}
                    {log.notes && ` · ${log.notes}`}
                  </div>
                </div>
              </div>

              {log.status === "needs_review" && (
                <div className="mt-3 flex gap-2 pl-14">
                  <Button
                    size="sm"
                    onClick={() => handleReview(log.id, "approve")}
                    disabled={loadingId === log.id}
                  >
                    <Check size={14} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReview(log.id, "reject")}
                    disabled={loadingId === log.id}
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
