"use client";

import { useState } from "react";
import Link from "next/link";
import type { PurchaseWithSubmitter } from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, Banknote } from "lucide-react";

interface ReviewListProps {
  purchases: PurchaseWithSubmitter[];
}

type Filter = "all" | "purchases" | "cash";

export function ReviewList({ purchases }: ReviewListProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const cashCount = purchases.filter((p) => p.isPaid).length;
  const supplierCount = purchases.filter((p) => !p.isPaid).length;

  const filtered = purchases.filter((p) => {
    if (filter === "cash") return p.isPaid;
    if (filter === "purchases") return !p.isPaid;
    return true;
  });

  const categories: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: purchases.length },
    { key: "purchases", label: "Supplier Deliveries", count: supplierCount },
    { key: "cash", label: "Cash Purchases", count: cashCount },
  ];

  return (
    <div>
      {/* Category cards */}
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
            <div className="text-ink-2 mt-1 text-xs font-semibold">{c.label}</div>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState message="Nothing to review in this group." />
      ) : (
        <Card className="p-0">
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              href={`/owner/review/${p.id}`}
              className={`hover:bg-bg flex items-center gap-4 px-5 py-4 ${
                i > 0 ? "border-line-2 border-t" : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                {p.isPaid ? (
                  <Banknote size={20} className="text-amber-500" />
                ) : (
                  <Package size={20} className="text-amber-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">
                    {p.isPaid ? "Cash purchase" : "Supplier delivery"}
                  </span>
                  <Badge variant="amber">Needs review</Badge>
                </div>
                <div className="text-ink-2 mt-0.5 text-[13px]">
                  {p.submitterName ?? "Unknown"} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString()}
                  {p.totalFils > 0 && ` · ${formatFils(p.totalFils)} BHD`}
                </div>
              </div>
              <span className="text-ink-3 text-sm">›</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
