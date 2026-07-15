"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LedgerChannel,
  SettlementLedger,
  SettlementPayment,
} from "@/types/money";
import { formatFils } from "@/lib/calculations/currency";
import { FEE_TYPE_OPTIONS } from "@/lib/settlement-fees";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2 } from "lucide-react";

/**
 * Running-total settlement ledger for a channel. The pooled "should have" comes
 * from the app's pending per-day amounts; the owner records payouts received
 * (money in) and commission kept by the provider (money lost). Both draw down
 * what's still owed, so the owner can see how much commission was taken.
 */
export function SettlementLedger({
  channel,
  ledgers,
}: {
  channel: LedgerChannel;
  ledgers: SettlementLedger[];
}) {
  const mine = ledgers.filter((l) => l.channel === channel);
  const [platform, setPlatform] = useState<string | null>(
    channel === "delivery" ? (mine[0]?.platform ?? null) : null,
  );

  const active =
    channel === "delivery"
      ? mine.find((l) => l.platform === platform)
      : mine[0];

  const empty: SettlementLedger = {
    channel,
    platform,
    shouldHaveFils: 0,
    receivedFils: 0,
    commissionFils: 0,
    stillOwedFils: 0,
    payments: [],
  };
  const ledger = active ?? empty;

  return (
    <div>
      {channel === "delivery" && mine.length > 0 && (
        <div className="bg-bg mb-4 inline-flex flex-wrap rounded-xl p-1">
          {mine.map((l) => (
            <button
              key={l.platform ?? "delivery"}
              onClick={() => setPlatform(l.platform)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                (platform ?? mine[0]?.platform) === l.platform
                  ? "text-navy bg-card shadow-sm"
                  : "text-ink-3"
              }`}
            >
              {l.platform ?? "Delivery"}
            </button>
          ))}
        </div>
      )}

      {channel === "delivery" && mine.length === 0 ? (
        <EmptyState message="No delivery settlements yet. They appear here after you approve daily closings with delivery sales." />
      ) : (
        <>
          <LedgerSummary ledger={ledger} />
          <Forms channel={channel} platform={ledger.platform} />
          <History payments={ledger.payments} />
        </>
      )}
    </div>
  );
}

function LedgerSummary({ ledger }: { ledger: SettlementLedger }) {
  const owedNegative = ledger.stillOwedFils < 0;
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="Should have" value={ledger.shouldHaveFils} />
      <Tile label="Received" value={ledger.receivedFils} color="text-rush-green" />
      <Tile
        label="Commission"
        value={ledger.commissionFils}
        color="text-rush-red"
      />
      <Tile
        label={owedNegative ? "Over-received" : "Still owed"}
        value={Math.abs(ledger.stillOwedFils)}
        color={owedNegative ? "text-rush-green" : "text-rush-amber"}
        strong
      />
    </div>
  );
}

function Tile({
  label,
  value,
  color = "text-ink",
  strong = false,
}: {
  label: string;
  value: number;
  color?: string;
  strong?: boolean;
}) {
  return (
    <Card className={strong ? "border-navy/30" : ""}>
      <CardContent className="py-3">
        <div className="text-ink-3 text-xs">{label}</div>
        <div className={`mt-1 font-mono text-[15px] font-bold ${color}`}>
          {formatFils(value)}
        </div>
      </CardContent>
    </Card>
  );
}

type FormKind = "payout" | "commission" | null;

function Forms({
  channel,
  platform,
}: {
  channel: LedgerChannel;
  platform: string | null;
}) {
  const [open, setOpen] = useState<FormKind>(null);

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={open === "payout" ? "primary" : "secondary"}
          onClick={() => setOpen((o) => (o === "payout" ? null : "payout"))}
        >
          <Plus size={15} className="mr-1" />
          Record payout
        </Button>
        <Button
          size="sm"
          variant={open === "commission" ? "primary" : "secondary"}
          onClick={() =>
            setOpen((o) => (o === "commission" ? null : "commission"))
          }
        >
          <Plus size={15} className="mr-1" />
          Record commission
        </Button>
      </div>

      {open === "payout" && (
        <PayoutForm
          channel={channel}
          platform={platform}
          onDone={() => setOpen(null)}
        />
      )}
      {open === "commission" && (
        <CommissionForm
          channel={channel}
          platform={platform}
          onDone={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function PayoutForm({
  channel,
  platform,
  onDone,
}: {
  channel: LedgerChannel;
  platform: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/money/settlement-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "payout",
        channel,
        platform: platform ?? undefined,
        amountBhd: Number(amount) || 0,
        receivedOn,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save");
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <p className="text-ink-3 mb-3 text-sm">
          The amount you received and the date it landed — not the days it was
          for. It posts to the bank and lowers what&apos;s still owed.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="payout-amount">Amount received (BHD)</Label>
            <Input
              id="payout-amount"
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000"
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor="payout-date">Received on</Label>
            <Input
              id="payout-date"
              type="date"
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value)}
            />
          </div>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
        {error && (
          <div className="bg-rush-red-bg text-rush-red mt-3 rounded-xl px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommissionForm({
  channel,
  platform,
  onDone,
}: {
  channel: LedgerChannel;
  platform: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const options = FEE_TYPE_OPTIONS[channel];
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [feeType, setFeeType] = useState(options[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/money/settlement-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "commission",
        channel,
        platform: platform ?? undefined,
        amountBhd: Number(amount) || 0,
        periodFrom: from,
        periodTo: to,
        feeType,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save");
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <p className="text-ink-3 mb-3 text-sm">
          The fee the provider kept over a date range. It lowers what&apos;s still
          owed (money that never arrives) — no cash moves.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="comm-amount">Commission (BHD)</Label>
            <Input
              id="comm-amount"
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000"
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor="comm-type">Fee type</Label>
            <select
              id="comm-type"
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
              className="border-line bg-card text-ink focus:border-navy h-10 w-full rounded-xl border px-3 text-sm outline-none"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="comm-from">From</Label>
            <Input
              id="comm-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="comm-to">To</Label>
            <Input
              id="comm-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={submit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
        {error && (
          <div className="bg-rush-red-bg text-rush-red mt-3 rounded-xl px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function History({ payments }: { payments: SettlementPayment[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string) {
    setDeletingId(id);
    await fetch(`/api/money/settlement-payments/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  if (payments.length === 0) {
    return (
      <EmptyState message="No payouts or commission recorded yet for this channel." />
    );
  }

  return (
    <Card className="p-0">
      {payments.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-4 px-5 py-4 ${
            i > 0 ? "border-line-2 border-t" : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {p.kind === "payout" ? (
                <Badge variant="green">Payout</Badge>
              ) : (
                <Badge variant="amber">Commission</Badge>
              )}
              {p.kind === "commission" && p.feeType && (
                <span className="text-ink text-sm font-semibold">
                  {p.feeType}
                </span>
              )}
            </div>
            <div className="text-ink-3 mt-0.5 text-[13px]">
              {p.kind === "payout"
                ? `Received on ${p.receivedOn}`
                : `${p.periodFrom} → ${p.periodTo}`}
            </div>
          </div>
          <div
            className={`w-28 text-right font-mono text-sm font-bold ${
              p.kind === "payout" ? "text-rush-green" : "text-rush-red"
            }`}
          >
            {p.kind === "payout" ? "+" : "−"}
            {formatFils(p.amountFils)}
          </div>
          <button
            onClick={() => remove(p.id)}
            disabled={deletingId === p.id}
            className="text-ink-3 hover:text-rush-red"
            aria-label="Delete entry"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </Card>
  );
}
