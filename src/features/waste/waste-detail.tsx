"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WasteLogWithDetails } from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Check, X, Undo2, Pencil } from "lucide-react";
import { WASTE_REASONS } from "@/lib/validators/waste";

const REASON_LABELS: Record<string, string> = {
  spoilage: "Spoilage",
  breakage: "Breakage",
  expired: "Expired",
  training: "Training",
  other: "Other",
};

export function WasteDetail({ log }: { log: WasteLogWithDetails }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = log.status === "needs_review";
  const isApproved = log.status === "approved";
  const stockQty = log.baseQty / (log.basePerStock || 1);
  const canEdit = isPending || isApproved;

  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(stockQty));
  const [reason, setReason] = useState(log.reason);
  const [notes, setNotes] = useState(log.notes ?? "");
  const [effectiveOn, setEffectiveOn] = useState(log.effectiveOn ?? "");

  function startEditing() {
    setQty(String(stockQty));
    setReason(log.reason);
    setNotes(log.notes ?? "");
    setEffectiveOn(log.effectiveOn ?? "");
    setError(null);
    setEditing(true);
  }

  async function save() {
    setError(null);

    const parsedQty = Number(qty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/waste/${log.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockQty: parsedQty,
        reason,
        notes: notes.trim() || null,
        ...(effectiveOn ? { effectiveOn } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Could not save changes",
      );
      setLoading(false);
      return;
    }

    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  async function act(action: "approve" | "reject" | "void") {
    if (
      action === "void" &&
      !window.confirm(
        "Void this approved waste? The wasted quantity and its value go back into stock, and the loss stops counting in reports.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/waste/${log.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Action failed");
      setLoading(false);
      return;
    }

    router.push("/owner/waste");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-rush-red-bg text-rush-red rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardContent>
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-2">Status</span>
              {isPending ? (
                <Badge variant="amber">Pending</Badge>
              ) : isApproved ? (
                <Badge variant="green">Approved</Badge>
              ) : (
                <Badge variant="red">Voided</Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Item</span>
              <span className="font-semibold">{log.itemName ?? "Item"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Quantity</span>
              <span className="font-mono font-semibold">
                {stockQty} {log.stockUnit ?? ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Reason</span>
              <span className="font-semibold">
                {REASON_LABELS[log.reason] || log.reason}
              </span>
            </div>
            {isApproved && (
              <div className="flex justify-between">
                <span className="text-ink-2">Loss value</span>
                <span className="text-rush-red font-mono font-semibold">
                  {formatFils(log.valueFils)} BHD
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-ink-2">Logged by</span>
              <span className="font-semibold">
                {log.submitterName ?? "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Logged on</span>
              <span className="font-semibold">
                {new Date(log.createdAt).toLocaleDateString()}
              </span>
            </div>
            {log.reviewedAt && (
              <div className="flex justify-between">
                <span className="text-ink-2">Reviewed</span>
                <span className="font-semibold">
                  {new Date(log.reviewedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {log.effectiveOn && (
              <div className="flex justify-between">
                <span className="text-ink-2">Loss reported on</span>
                <span className="font-mono font-semibold">
                  {log.effectiveOn}
                </span>
              </div>
            )}
            {log.notes && (
              <div className="border-line-2 mt-1 border-t pt-2">
                <span className="text-ink-2">Notes: </span>
                {log.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canEdit && !editing && (
        <div>
          <Button variant="secondary" onClick={startEditing} disabled={loading}>
            <Pencil size={16} className="mr-1" />
            Edit entry
          </Button>
        </div>
      )}

      {editing && (
        <Card>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="qty">
                  Quantity ({log.stockUnit ?? "units"})
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {WASTE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {REASON_LABELS[r] || r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-3">
              <Label htmlFor="effectiveOn">Apply loss to</Label>
              <Input
                id="effectiveOn"
                type="date"
                value={effectiveOn}
                onChange={(e) => setEffectiveOn(e.target.value)}
                className="max-w-[200px] font-mono"
              />
              <p className="text-ink-3 mt-1 text-xs">
                The month this loss is reported in.
              </p>
            </div>

            <div className="mt-3">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <p className="text-ink-3 mt-3 text-sm">
              {isApproved
                ? "Saving re-adjusts stock and the recorded loss to match. If you already marked this as ordinary usage rather than waste, it stays that way."
                : "Nothing is applied until you approve this entry."}
            </p>

            <div className="mt-3 flex gap-2">
              <Button onClick={save} disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending && !editing && (
        <div className="flex gap-2">
          <Button onClick={() => act("approve")} disabled={loading}>
            <Check size={16} className="mr-1" />
            Approve
          </Button>
          <Button
            variant="secondary"
            onClick={() => act("reject")}
            disabled={loading}
            className="text-rush-red"
          >
            <X size={16} className="mr-1" />
            Reject
          </Button>
        </div>
      )}

      {isApproved && !editing && (
        <div>
          <p className="text-ink-3 mb-3 text-sm">
            Voiding puts the wasted quantity and its value back into stock and
            removes the loss from reports. The record stays for audit.
          </p>
          <Button
            variant="secondary"
            onClick={() => act("void")}
            disabled={loading}
            className="text-rush-red"
          >
            <Undo2 size={16} className="mr-1" />
            Void &amp; restore stock
          </Button>
        </div>
      )}
    </div>
  );
}
