"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryPlatform } from "@/types/delivery";
import { filsToBhd } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

export function PlatformForm({
  platform,
  onDone,
}: {
  platform: DeliveryPlatform | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const editing = platform !== null;
  const [name, setName] = useState(platform?.name ?? "");
  const [commissionPct, setCommissionPct] = useState(
    platform ? String(platform.commissionBps / 100) : "",
  );
  const [fixedFee, setFixedFee] = useState(
    platform ? String(filsToBhd(platform.fixedFeeFils)) : "",
  );
  const [active, setActive] = useState(platform?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Enter a platform name.");
      return;
    }
    setLoading(true);
    const payload = {
      name: name.trim(),
      commissionPct: Number(commissionPct) || 0,
      fixedFeeBhd: Number(fixedFee) || 0,
      active,
    };
    const res = await fetch(
      editing
        ? `/api/delivery/platforms/${platform!.id}`
        : "/api/delivery/platforms",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
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
        ← Back to Delivery Apps
      </button>
      <h1 className="text-ink mb-1 text-2xl font-bold">
        {editing ? `Edit ${platform!.name}` : "Add Platform"}
      </h1>
      <p className="text-ink-2 mb-5 text-sm">
        Commission and per-order fee drive the expected payout created at EOD.
      </p>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pf-name">Platform name</Label>
              <Input
                id="pf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Talabat"
              />
            </div>
            <div>
              <Label htmlFor="pf-commission">Commission (%)</Label>
              <Input
                id="pf-commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                placeholder="0"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="pf-fee">Fixed fee / order (BHD)</Label>
              <Input
                id="pf-fee"
                type="number"
                min="0"
                step="0.001"
                value={fixedFee}
                onChange={(e) => setFixedFee(e.target.value)}
                placeholder="0.000"
                className="font-mono"
              />
            </div>
          </div>

          <label className="bg-bg mt-4 flex cursor-pointer items-center justify-between rounded-xl px-4 py-3">
            <span>
              <span className="text-ink block text-sm font-semibold">
                Active
              </span>
              <span className="text-ink-3 block text-xs">
                Inactive platforms are hidden from the EOD wizard
              </span>
            </span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5"
            />
          </label>
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
          {loading ? "Saving..." : editing ? "Save Changes" : "Add Platform"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
