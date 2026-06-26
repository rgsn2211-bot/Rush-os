"use client";

import { useState } from "react";
import Link from "next/link";
import type { InventoryCountSummary } from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList } from "lucide-react";

interface Props {
  counts: InventoryCountSummary[];
}

type Filter = "all" | "pending" | "reviewed";

export function InventoryCountList({ counts }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const pending = counts.filter((c) => c.status === "needs_review");
  const reviewed = counts.filter((c) => c.status !== "needs_review");

  const filtered =
    filter === "pending" ? pending : filter === "reviewed" ? reviewed : counts;

  const categories: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "reviewed", label: "Reviewed", count: reviewed.length },
  ];

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

  /** Net value change of an approved session, signed (e.g. "-1.250" / "+0.500"). */
  function describeNet(c: InventoryCountSummary): string | null {
    if (c.status !== "approved") return null;
    const sign = c.netValueFils < 0 ? "−" : "+";
    return `${sign}${formatFils(Math.abs(c.netValueFils))} BHD`;
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

      {filtered.length === 0 ? (
        <EmptyState message="No inventory counts in this group." />
      ) : (
        <Card className="p-0">
          {filtered.map((c, i) => {
            const net = describeNet(c);
            return (
              <Link
                key={c.id}
                href={`/owner/inventory-count/${c.id}`}
                className={`hover:bg-bg flex items-center gap-4 px-5 py-4 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <ClipboardList size={20} className="text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold">
                      Count · {new Date(c.countedAt).toLocaleDateString()}
                    </span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="text-ink-2 mt-0.5 text-[13px]">
                    {c.submitterName ?? "Unknown"} · {c.itemCount} item
                    {c.itemCount !== 1 ? "s" : ""}
                    {net && ` · net ${net}`}
                  </div>
                </div>
                <span className="text-ink-3 text-sm">›</span>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
