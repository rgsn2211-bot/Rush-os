"use client";

import { useState } from "react";
import type { DeliveryPlatform } from "@/types/delivery";
import { formatFils } from "@/lib/calculations/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlatformForm } from "@/features/delivery/platform-form";
import { Plus, Pencil } from "lucide-react";

interface Props {
  platforms: DeliveryPlatform[];
}

type Tab = "settings" | "report" | "settlement";

const TABS: { v: Tab; label: string }[] = [
  { v: "settings", label: "Settings" },
  { v: "report", label: "Report" },
  { v: "settlement", label: "Settlement" },
];

export function DeliveryDashboard({ platforms }: Props) {
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
      {tab === "report" && (
        <EmptyState message="Per-platform sales & commission report — coming with settlement reconciliation." />
      )}
      {tab === "settlement" && (
        <EmptyState message="Settlement reconciliation — coming next. Expected payouts are created automatically when EOD is approved." />
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
