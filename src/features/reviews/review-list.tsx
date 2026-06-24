"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  PurchaseWithSubmitter,
  WasteLogWithDetails,
} from "@/types/inventory";
import type { ComplimentaryLogWithSubmitter } from "@/types/pos";
import type { DailyClosingWithSubmitter } from "@/types/closing";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Package,
  Banknote,
  Gift,
  Trash2,
  ClipboardList,
} from "lucide-react";

interface ReviewListProps {
  purchases: PurchaseWithSubmitter[];
  complimentaryLogs?: ComplimentaryLogWithSubmitter[];
  wasteLogs?: WasteLogWithDetails[];
  closings?: DailyClosingWithSubmitter[];
}

type Filter =
  | "all"
  | "purchases"
  | "cash"
  | "complimentary"
  | "waste"
  | "closing";

export function ReviewList({
  purchases,
  complimentaryLogs = [],
  wasteLogs = [],
  closings = [],
}: ReviewListProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const cashCount = purchases.filter((p) => p.isPaid).length;
  const supplierCount = purchases.filter((p) => !p.isPaid).length;
  const compCount = complimentaryLogs.length;
  const wasteCount = wasteLogs.length;
  const closingCount = closings.length;

  const filteredPurchases = purchases.filter((p) => {
    if (filter === "cash") return p.isPaid;
    if (filter === "purchases") return !p.isPaid;
    if (filter === "complimentary" || filter === "waste" || filter === "closing")
      return false;
    return true;
  });

  const filteredComp =
    filter === "complimentary" || filter === "all" ? complimentaryLogs : [];

  const filteredWaste =
    filter === "waste" || filter === "all" ? wasteLogs : [];

  const filteredClosings =
    filter === "closing" || filter === "all" ? closings : [];

  const totalCount =
    filteredPurchases.length +
    filteredComp.length +
    filteredWaste.length +
    filteredClosings.length;

  const categories: { key: Filter; label: string; count: number }[] = [
    {
      key: "all",
      label: "All",
      count: purchases.length + compCount + wasteCount + closingCount,
    },
    { key: "purchases", label: "Supplier Deliveries", count: supplierCount },
    { key: "cash", label: "Cash Purchases", count: cashCount },
    { key: "complimentary", label: "Complimentary", count: compCount },
    { key: "waste", label: "Waste", count: wasteCount },
    { key: "closing", label: "Daily Closing", count: closingCount },
  ];

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

      {totalCount === 0 ? (
        <EmptyState message="Nothing to review in this group." />
      ) : (
        <Card className="p-0">
          {filteredPurchases.map((p, i) => (
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
          {filteredComp.map((log, i) => (
            <Link
              key={log.id}
              href="/owner/complimentary"
              className={`hover:bg-bg flex items-center gap-4 px-5 py-4 ${
                filteredPurchases.length > 0 || i > 0
                  ? "border-line-2 border-t"
                  : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                <Gift size={20} className="text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">
                    {log.description}
                  </span>
                  <Badge variant="amber">Needs review</Badge>
                </div>
                <div className="text-ink-2 mt-0.5 text-[13px]">
                  {log.submitterName ?? "Unknown"} ·{" "}
                  {new Date(log.createdAt).toLocaleDateString()} ·{" "}
                  {formatFils(log.amountFils)} BHD
                </div>
              </div>
              <span className="text-ink-3 text-sm">›</span>
            </Link>
          ))}
          {filteredWaste.map((log, i) => (
            <Link
              key={log.id}
              href="/owner/waste"
              className={`hover:bg-bg flex items-center gap-4 px-5 py-4 ${
                filteredPurchases.length > 0 ||
                filteredComp.length > 0 ||
                i > 0
                  ? "border-line-2 border-t"
                  : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <Trash2 size={20} className="text-rush-red" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">
                    {log.itemName ?? "Waste"}
                  </span>
                  <Badge variant="amber">Needs review</Badge>
                </div>
                <div className="text-ink-2 mt-0.5 text-[13px]">
                  {log.submitterName ?? "Unknown"} ·{" "}
                  {new Date(log.createdAt).toLocaleDateString()} ·{" "}
                  {log.baseQty / (log.basePerStock || 1)}{" "}
                  {log.stockUnit ?? ""}
                </div>
              </div>
              <span className="text-ink-3 text-sm">›</span>
            </Link>
          ))}
          {filteredClosings.map((c, i) => (
            <Link
              key={c.id}
              href="/owner/closing"
              className={`hover:bg-bg flex items-center gap-4 px-5 py-4 ${
                filteredPurchases.length > 0 ||
                filteredComp.length > 0 ||
                filteredWaste.length > 0 ||
                i > 0
                  ? "border-line-2 border-t"
                  : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <ClipboardList size={20} className="text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">
                    Daily closing · {c.reportDate}
                  </span>
                  <Badge variant="amber">Needs review</Badge>
                </div>
                <div className="text-ink-2 mt-0.5 text-[13px]">
                  {c.submitterName ?? "Unknown"} · {c.totalOrders} orders ·{" "}
                  {formatFils(c.grossSalesFils)} BHD gross
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
