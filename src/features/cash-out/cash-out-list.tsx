"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegisterCashOutWithSubmitter } from "@/types/register-cash-out";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Check, X, Banknote } from "lucide-react";

interface Props {
  cashOuts: RegisterCashOutWithSubmitter[];
}

type Filter = "all" | "pending" | "reviewed";

export function CashOutList({ cashOuts }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = cashOuts.filter((c) => c.status === "needs_review");
  const reviewed = cashOuts.filter((c) => c.status !== "needs_review");

  const filtered =
    filter === "pending" ? pending : filter === "reviewed" ? reviewed : cashOuts;

  const totalApprovedFils = cashOuts
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + c.amountFils, 0);

  const categories: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: cashOuts.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "reviewed", label: "Reviewed", count: reviewed.length },
  ];

  async function handleReview(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setError(null);

    const res = await fetch(`/api/cash-out/${id}`, {
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
              filter === c.key ? "border-navy bg-white" : "border-line bg-white"
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

      {totalApprovedFils > 0 && (
        <div className="text-ink-3 mb-4 text-sm">
          Total approved cash out:{" "}
          <strong className="text-ink">
            {formatFils(totalApprovedFils)} BHD
          </strong>
        </div>
      )}

      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="No cash-outs in this group." />
      ) : (
        <Card className="p-0">
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`px-5 py-4 ${i > 0 ? "border-line-2 border-t" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="bg-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Banknote size={20} className="text-navy" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold capitalize">
                      {c.kind} · {formatFils(c.amountFils)} BHD
                    </span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="text-ink-2 mt-0.5 text-[13px]">
                    {c.submitterName ?? "Unknown"} ·{" "}
                    {new Date(c.createdAt).toLocaleDateString()} · {c.reason}
                    {c.note && ` · ${c.note}`}
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
