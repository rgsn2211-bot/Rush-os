"use client";

import { useState } from "react";
import type {
  SettlementChannel,
  SettlementLedger,
  CashFlowProjection,
} from "@/types/money";
import { formatFils } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettlementLedger as SettlementLedgerView } from "@/features/money/settlement-ledger";
import { Plus } from "lucide-react";

const CHANNELS: { v: SettlementChannel; label: string }[] = [
  { v: "card", label: "Card" },
  { v: "benefitpay", label: "BenefitPay" },
  { v: "delivery", label: "Delivery Apps" },
];

const CHANNEL_NOTE: Record<SettlementChannel, string> = {
  card: "Card pays in lump sums that don't map to days. Record each payout received and the commission taken; the running total shows what's still owed.",
  benefitpay:
    "BenefitPay pays into the bank. Record each payout received (and any fee taken); the running total shows what's still owed.",
  delivery:
    "Delivery apps pay per platform. Record payouts received and the commission taken; the running total shows what's still owed.",
};

export function CashFlowView({
  ledgers,
  projection,
  onNew,
}: {
  ledgers: SettlementLedger[];
  projection: CashFlowProjection;
  onNew: () => void;
}) {
  const [channel, setChannel] = useState<SettlementChannel>("card");

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
        <Button size="sm" variant="secondary" onClick={onNew}>
          <Plus size={15} className="mr-1" />
          Add expected
        </Button>
      </div>

      <SettlementLedgerView channel={channel} ledgers={ledgers} />

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
