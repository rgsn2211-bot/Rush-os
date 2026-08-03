"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemLossDetail, ItemLossRow } from "@/services/losses";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CLASS_LABEL: Record<string, string> = {
  sold: "Sold",
  used: "Used internally",
  wasted: "Wasted",
  shrinkage: "Shrinkage",
  overage: "Overage",
};

const SOURCE_LABEL: Record<string, string> = {
  pos_import: "POS sale",
  waste: "Waste",
  count: "Count",
};

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function ItemLossDetailView({ detail }: { detail: ItemLossDetail }) {
  const router = useRouter();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [toClass, setToClass] = useState<"used" | "sold">("used");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdjust(row: ItemLossRow) {
    setOpenRowId(row.id);
    setToClass("used");
    setQty("");
    setNote("");
    setError(null);
  }

  async function submitAdjust(row: ItemLossRow) {
    setLoading(true);
    setError(null);

    const trimmed = qty.trim();
    const parsedQty = trimmed === "" ? undefined : Number(trimmed);
    if (parsedQty !== undefined && (!Number.isFinite(parsedQty) || parsedQty <= 0)) {
      setError("Quantity must be greater than 0.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/losses/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usageId: row.id,
        toClass,
        ...(parsedQty !== undefined ? { qtyBase: parsedQty } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Could not adjust this",
      );
      setLoading(false);
      return;
    }

    setOpenRowId(null);
    setLoading(false);
    router.refresh();
  }

  async function revert(row: ItemLossRow) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/losses/adjust", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usageId: row.id }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Revert failed");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  const canAdjust = (row: ItemLossRow) =>
    row.usageClass === "wasted" || row.usageClass === "shrinkage";

  return (
    <div>
      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <p className="text-ink-3 mb-4 text-sm">
        Adjusting a record only changes how it is <em>reported</em>. The stock
        really did leave the shelf, so nothing is added back to inventory and
        your net profit does not move — the value just stops counting as a loss
        and starts counting as ordinary usage.
      </p>

      <Card className="overflow-hidden p-0">
        <div className="text-ink-3 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-line-2 px-5 py-3 text-[11px] font-bold tracking-wider uppercase">
          <div>Date</div>
          <div>Source</div>
          <div className="text-right">Quantity</div>
          <div className="text-right">Value (BHD)</div>
          <div className="text-right">Counts as</div>
        </div>

        {detail.rows.length === 0 && (
          <div className="text-ink-3 px-5 py-8 text-center text-sm">
            Nothing recorded for {detail.name} in this period.
          </div>
        )}

        {detail.rows.map((row, i) => (
          <div
            key={row.id}
            className={i > 0 ? "border-line-2 border-t" : undefined}
          >
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2 px-5 py-3 text-sm">
              <div className="font-mono text-xs">{row.occurredOn}</div>
              <div className="text-ink-2">
                {SOURCE_LABEL[row.sourceType] ?? row.sourceType}
              </div>
              <div className="text-right font-mono">
                {round(row.qtyBase)} {detail.baseUnit}
              </div>
              <div className="text-right font-mono">
                {formatFils(Math.abs(row.valueFils))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Badge
                  variant={
                    row.usageClass === "wasted" || row.usageClass === "shrinkage"
                      ? "red"
                      : "default"
                  }
                >
                  {CLASS_LABEL[row.usageClass] ?? row.usageClass}
                </Badge>
                {row.isAdjusted ? (
                  <Button
                    variant="ghost"
                    onClick={() => revert(row)}
                    disabled={loading}
                  >
                    Undo
                  </Button>
                ) : canAdjust(row) ? (
                  <Button
                    variant="ghost"
                    onClick={() => openAdjust(row)}
                    disabled={loading}
                  >
                    Adjust
                  </Button>
                ) : null}
              </div>
            </div>

            {row.reclassNote && (
              <div className="text-ink-3 px-5 pb-3 text-xs italic">
                {row.reclassNote}
              </div>
            )}

            {openRowId === row.id && (
              <div className="bg-bg border-line-2 border-t px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`class-${row.id}`}>This was really</Label>
                    <Select
                      id={`class-${row.id}`}
                      value={toClass}
                      onChange={(e) =>
                        setToClass(e.target.value as "used" | "sold")
                      }
                    >
                      <option value="used">
                        Used internally (napkins, cleaning, testing)
                      </option>
                      <option value="sold">
                        Actually sold (the POS did not deduct it)
                      </option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`qty-${row.id}`}>
                      How much, in {detail.baseUnit} (blank = all of it)
                    </Label>
                    <Input
                      id={`qty-${row.id}`}
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder={String(round(Math.abs(row.qtyBase)))}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <Label htmlFor={`note-${row.id}`}>Note (optional)</Label>
                  <Input
                    id={`note-${row.id}`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why this was not a real loss..."
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <Button onClick={() => submitAdjust(row)} disabled={loading}>
                    {loading ? "Saving..." : "Adjust"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setOpenRowId(null)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
