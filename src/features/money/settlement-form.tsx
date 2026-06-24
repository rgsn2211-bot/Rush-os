"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SettlementChannel } from "@/types/money";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Check } from "lucide-react";

const CHANNELS: { v: SettlementChannel; label: string }[] = [
  { v: "card", label: "Card" },
  { v: "benefitpay", label: "BenefitPay" },
  { v: "delivery", label: "Delivery app" },
];

export function SettlementForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [channel, setChannel] = useState<SettlementChannel>("card");
  const [platform, setPlatform] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [expected, setExpected] = useState("");
  const [fee, setFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!periodLabel.trim()) {
      setError("Enter a period (e.g. '8–14 Jun' or 'June').");
      return;
    }
    if (!(Number(expected) > 0)) {
      setError("Enter the expected amount.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/money/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        platform:
          channel === "delivery" ? platform.trim() || undefined : undefined,
        periodLabel: periodLabel.trim(),
        expectedBhd: Number(expected),
        feeBhd: Number(fee) > 0 ? Number(fee) : undefined,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save");
      return;
    }

    router.refresh();
    onDone();
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={onDone}
        className="text-ink-3 hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        ← Back to Money
      </button>
      <h1 className="text-ink mb-1 text-2xl font-bold">Expected Settlement</h1>
      <p className="text-ink-2 mb-5 text-sm">
        Record money a payment provider owes you, then confirm it when received.
      </p>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select
                id="channel"
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as SettlementChannel)
                }
              >
                {CHANNELS.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            {channel === "delivery" && (
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Input
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g. Talabat"
                />
              </div>
            )}
            <div>
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="e.g. 8–14 Jun"
              />
            </div>
            <div>
              <Label htmlFor="expected">Expected (BHD)</Label>
              <Input
                id="expected"
                type="number"
                min="0"
                step="0.001"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                placeholder="0.000"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="fee">Fee / deduction (BHD)</Label>
              <Input
                id="fee"
                type="number"
                min="0"
                step="0.001"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="optional"
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-rush-red-bg text-rush-red mt-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Button size="lg" onClick={handleSave} disabled={loading}>
          <Check size={18} className="mr-1.5" />
          {loading ? "Saving..." : "Save Settlement"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
