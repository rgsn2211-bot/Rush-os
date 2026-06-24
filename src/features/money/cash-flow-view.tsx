"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Settlement,
  SettlementChannel,
  CashFlowProjection,
} from "@/types/money";
import { formatFils } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Check, Trash2 } from "lucide-react";

const CHANNELS: { v: SettlementChannel; label: string }[] = [
  { v: "card", label: "Card" },
  { v: "benefitpay", label: "BenefitPay" },
  { v: "delivery", label: "Delivery Apps" },
];

const CHANNEL_NOTE: Record<SettlementChannel, string> = {
  card: "Card settles with a short delay and a processing fee deducted before payout.",
  benefitpay:
    "BenefitPay goes directly to the bank with no fee — confirm received to reconcile.",
  delivery:
    "Delivery apps settle monthly. Commission and fixed fees are deducted before payout.",
};

export function CashFlowView({
  settlements,
  projection,
  onNew,
}: {
  settlements: Settlement[];
  projection: CashFlowProjection;
  onNew: () => void;
}) {
  const [channel, setChannel] = useState<SettlementChannel>("card");
  const rows = settlements.filter((s) => s.channel === channel);

  return (
    <div>
      <Card className="mb-6">
        <CardContent>
          <div className="text-ink mb-3 text-[15px] font-bold">
            Projected Cash Position
          </div>
          <ProjectedRow projection={projection} />
          <p className="text-ink-3 mt-3 text-xs">
            Cash flow follows money received/paid dates — not sales dates.
          </p>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="bg-bg inline-flex rounded-xl p-1">
          {CHANNELS.map((c) => (
            <button
              key={c.v}
              onClick={() => setChannel(c.v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                channel === c.v ? "text-navy bg-card shadow-sm" : "text-ink-3"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onNew}>
          <Plus size={15} className="mr-1" />
          Add Settlement
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No settlements recorded for this channel." />
      ) : (
        <Card className="p-0">
          {rows.map((s, i) => (
            <SettlementRow key={s.id} settlement={s} first={i === 0} />
          ))}
        </Card>
      )}

      <p className="text-ink-3 mt-3 text-xs leading-relaxed">
        {CHANNEL_NOTE[channel]}
      </p>
    </div>
  );
}

function ProjectedRow({ projection }: { projection: CashFlowProjection }) {
  const rows: [string, number, string, boolean][] = [
    ["Available cash now", projection.availableNowFils, "text-ink", false],
    [
      "+ Expected incoming",
      projection.expectedIncomingFils,
      "text-rush-green",
      false,
    ],
    [
      "− Upcoming outgoing",
      -projection.upcomingOutgoingFils,
      "text-rush-red",
      false,
    ],
    [
      "= Projected cash",
      projection.projectedFils,
      projection.projectedFils < 0 ? "text-rush-red" : "text-rush-green",
      true,
    ],
  ];
  return (
    <div>
      {rows.map(([label, value, color, strong], i) => (
        <div
          key={label}
          className={`flex items-center justify-between py-2.5 ${
            i > 0 ? "border-line-2 border-t" : ""
          } ${strong ? "border-line border-t-2" : ""}`}
        >
          <span
            className={`text-[13.5px] ${
              strong ? "text-ink font-bold" : "text-ink-2 font-medium"
            }`}
          >
            {label}
          </span>
          <span
            className={`font-mono font-bold ${strong ? "text-base" : "text-sm"} ${color}`}
          >
            {value < 0 ? "−" : ""}
            {formatFils(Math.abs(value))}
          </span>
        </div>
      ))}
    </div>
  );
}

function SettlementRow({
  settlement: s,
  first,
}: {
  settlement: Settlement;
  first: boolean;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [confirming, setConfirming] = useState(false);
  const [actual, setActual] = useState("");
  const [fee, setFee] = useState(
    s.feeFils !== null ? String(s.feeFils / 1000) : "",
  );
  const [receivedOn, setReceivedOn] = useState(today);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    await fetch(`/api/money/settlements/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualBhd: Number(actual) || 0,
        feeBhd: Number(fee) > 0 ? Number(fee) : undefined,
        receivedOn,
      }),
    });
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  async function remove() {
    setLoading(true);
    await fetch(`/api/money/settlements/${s.id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className={first ? "" : "border-line-2 border-t"}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {s.platform && (
              <span className="text-[15px] font-bold">{s.platform}</span>
            )}
            <span
              className={s.platform ? "text-ink-2 text-sm" : "text-[15px] font-bold"}
            >
              {s.periodLabel}
            </span>
            {s.status === "received" ? (
              <Badge variant="green">Received</Badge>
            ) : (
              <Badge variant="amber">Pending</Badge>
            )}
          </div>
          <div className="text-ink-3 mt-0.5 text-[13px]">
            Expected {formatFils(s.expectedFils)}
            {s.feeFils !== null && ` · fee ${formatFils(s.feeFils)}`}
            {s.actualFils !== null &&
              ` · received ${formatFils(s.actualFils)} on ${s.receivedOn}`}
          </div>
        </div>
        {s.status === "pending" ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirming((c) => !c)}
            disabled={loading}
          >
            Confirm
          </Button>
        ) : (
          <Check size={18} className="text-rush-green" />
        )}
        <button
          onClick={remove}
          disabled={loading}
          className="text-ink-3 hover:text-rush-red"
          aria-label="Delete settlement"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {confirming && s.status === "pending" && (
        <div className="bg-bg grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor={`actual-${s.id}`}>Actual received (BHD)</Label>
            <Input
              id={`actual-${s.id}`}
              type="number"
              min="0"
              step="0.001"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder={formatFils(s.expectedFils)}
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor={`fee-${s.id}`}>Fee (BHD)</Label>
            <Input
              id={`fee-${s.id}`}
              type="number"
              min="0"
              step="0.001"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0.000"
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor={`date-${s.id}`}>Received on</Label>
            <Input
              id={`date-${s.id}`}
              type="date"
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value)}
            />
          </div>
          <Button onClick={confirm} disabled={loading}>
            <Check size={16} className="mr-1" />
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
