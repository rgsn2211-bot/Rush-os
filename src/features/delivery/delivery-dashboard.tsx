"use client";

import { useState } from "react";
import type { DeliveryPlatform } from "@/types/delivery";
import type { Settlement } from "@/types/money";
import { formatFils } from "@/lib/calculations/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlatformForm } from "@/features/delivery/platform-form";
import { SettlementReconcile } from "@/features/delivery/settlement-reconcile";
import { Plus, Pencil } from "lucide-react";

interface Props {
  platforms: DeliveryPlatform[];
  settlements: Settlement[];
}

type Tab = "settings" | "report" | "settlement";

const TABS: { v: Tab; label: string }[] = [
  { v: "settings", label: "Settings" },
  { v: "report", label: "Report" },
  { v: "settlement", label: "Settlement" },
];

export function DeliveryDashboard({ platforms, settlements }: Props) {
  const [tab, setTab] = useState<Tab>("settings");
  const [editing, setEditing] = useState<DeliveryPlatform | null>(null);
  const [adding, setAdding] = useState(false);

  if (adding) return <PlatformForm platform={null} onDone={() => setAdding(false)} />;
  if (editing)
    return <PlatformForm platform={editing} onDone={() => setEditing(null)} />;

  return (
    <div>
      <PageHeader
        title="Delivery Apps"
        subtitle="Platform commissions and settlements"
      />

      <div className="border-line mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.v
                ? "border-navy text-navy"
                : "text-ink-3 hover:text-ink border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "settings" && (
        <Settings
          platforms={platforms}
          onAdd={() => setAdding(true)}
          onEdit={setEditing}
        />
      )}
      {tab === "report" && <Report settlements={settlements} />}
      {tab === "settlement" && (
        <SettlementReconcile settlements={settlements} />
      )}
    </div>
  );
}

function Settings({
  platforms,
  onAdd,
  onEdit,
}: {
  platforms: DeliveryPlatform[];
  onAdd: () => void;
  onEdit: (p: DeliveryPlatform) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-ink-3 text-sm">
          Commission % + fixed fee per order, per platform. These drive the
          expected payout calculated at end-of-day.
        </p>
        <Button size="sm" onClick={onAdd}>
          <Plus size={15} className="mr-1" />
          Add Platform
        </Button>
      </div>

      {platforms.length === 0 ? (
        <EmptyState message="No platforms yet." />
      ) : (
        <Card className="p-0">
          {platforms.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i > 0 ? "border-line-2 border-t" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold">{p.name}</span>
                  {p.active ? (
                    <Badge variant="green">Active</Badge>
                  ) : (
                    <Badge variant="default">Inactive</Badge>
                  )}
                </div>
                <div className="text-ink-3 text-[13px]">
                  {(p.commissionBps / 100).toFixed(p.commissionBps % 100 ? 1 : 0)}
                  % commission · {formatFils(p.fixedFeeFils)} BHD / order
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onEdit(p)}
              >
                <Pencil size={14} className="mr-1" />
                Edit
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

interface PlatformAgg {
  platform: string;
  grossFils: number;
  commissionFils: number;
  expectedFils: number;
  receivedFils: number;
  pendingFils: number;
}

function Report({ settlements }: { settlements: Settlement[] }) {
  const byPlatform = new Map<string, PlatformAgg>();
  for (const s of settlements) {
    const key = s.platform ?? "Delivery";
    const agg =
      byPlatform.get(key) ??
      {
        platform: key,
        grossFils: 0,
        commissionFils: 0,
        expectedFils: 0,
        receivedFils: 0,
        pendingFils: 0,
      };
    agg.grossFils += s.grossFils ?? 0;
    agg.commissionFils += s.feeFils ?? 0;
    agg.expectedFils += s.expectedFils;
    if (s.status === "received") agg.receivedFils += s.actualFils ?? 0;
    else agg.pendingFils += s.expectedFils;
    byPlatform.set(key, agg);
  }

  const rows = [...byPlatform.values()].sort((a, b) => b.grossFils - a.grossFils);

  if (rows.length === 0) {
    return (
      <EmptyState message="No delivery sales yet. Figures appear here after you approve daily closings with delivery sales." />
    );
  }

  return (
    <div>
      <p className="text-ink-3 mb-4 text-sm">
        Per-platform totals across all approved days. Commission is what the
        platforms keep; net is what you should receive.
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-line-2 text-ink-3 border-b text-left text-xs">
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 text-right font-semibold">Gross</th>
              <th className="px-4 py-3 text-right font-semibold">Commission</th>
              <th className="px-4 py-3 text-right font-semibold">Net expected</th>
              <th className="px-4 py-3 text-right font-semibold">Received</th>
              <th className="px-4 py-3 text-right font-semibold">Pending</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.platform} className="border-line-2 border-b last:border-0">
                <td className="px-4 py-3 font-semibold">{r.platform}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatFils(r.grossFils)}
                </td>
                <td className="text-rush-red px-4 py-3 text-right font-mono">
                  {formatFils(r.commissionFils)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold">
                  {formatFils(r.expectedFils)}
                </td>
                <td className="text-rush-green px-4 py-3 text-right font-mono">
                  {formatFils(r.receivedFils)}
                </td>
                <td className="text-ink-2 px-4 py-3 text-right font-mono">
                  {formatFils(r.pendingFils)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
