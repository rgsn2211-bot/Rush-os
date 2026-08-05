"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  InventoryCountWithItems,
  InventoryCountItemWithDetails,
  InventoryItem,
} from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { stockToBaseQty } from "@/lib/calculations/costing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Check, X, Trash2, Undo2, Pencil, EyeOff } from "lucide-react";

interface Props {
  count: InventoryCountWithItems;
  /** Every live item, so the owner can add one the worker missed. */
  items: InventoryItem[];
}

/** A base-unit quantity shown in stock units (trailing zeros trimmed). */
function toStock(baseQty: number, basePerStock: number): number {
  return baseQty / (basePerStock || 1);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** One row of the edit form. Quantities are entered in the item's stock unit. */
interface EditLine {
  inventoryItemId: string;
  name: string;
  stockUnit: string;
  baseUnit: string;
  basePerStock: number;
  /** Raw input string so a half-typed number does not fight the user. */
  countedStockQty: string;
}

export function InventoryCountDetail({ count, items }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const isPending = count.status === "needs_review";
  const isApproved = count.status === "approved";
  const canEdit = isPending || isApproved;

  // An approved count gets a trailing per-line actions column.
  const gridCols = isApproved
    ? "grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]"
    : "grid-cols-[1.6fr_1fr_1fr_1fr_1fr]";

  const itemById = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  );

  const [lines, setLines] = useState<EditLine[]>([]);
  const [effectiveOn, setEffectiveOn] = useState(count.effectiveOn ?? "");
  const [addItemId, setAddItemId] = useState("");

  function startEditing() {
    setLines(
      count.items.map((line) => {
        const item = itemById.get(line.inventoryItemId);
        return {
          inventoryItemId: line.inventoryItemId,
          name: line.itemName ?? item?.name ?? "Item",
          stockUnit: line.stockUnit ?? item?.stockUnit ?? "",
          baseUnit: item?.baseUnit ?? "",
          basePerStock: line.basePerStock || 1,
          countedStockQty: String(
            toStock(line.countedBaseQty, line.basePerStock),
          ),
        };
      }),
    );
    setEffectiveOn(count.effectiveOn ?? "");
    setError(null);
    setEditing(true);
  }

  function updateLine(itemId: string, value: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.inventoryItemId === itemId ? { ...l, countedStockQty: value } : l,
      ),
    );
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.inventoryItemId !== itemId));
  }

  function addLine(itemId: string) {
    setAddItemId("");
    if (!itemId) return;
    const item = itemById.get(itemId);
    if (!item || lines.some((l) => l.inventoryItemId === itemId)) return;

    setLines((prev) => [
      ...prev,
      {
        inventoryItemId: item.id,
        name: item.name,
        stockUnit: item.stockUnit,
        baseUnit: item.baseUnit,
        basePerStock: item.basePerStock,
        countedStockQty: "",
      },
    ]);
  }

  const availableToAdd = items.filter(
    (i) => !lines.some((l) => l.inventoryItemId === i.id),
  );

  async function handleSave() {
    setError(null);

    const payloadItems = lines
      .filter((l) => l.countedStockQty.trim() !== "")
      .map((l) => ({
        inventoryItemId: l.inventoryItemId,
        countedStockQty: Number(l.countedStockQty),
      }));

    if (payloadItems.length === 0) {
      setError("A count needs at least one item with a quantity.");
      return;
    }
    if (
      payloadItems.some(
        (i) => !Number.isFinite(i.countedStockQty) || i.countedStockQty < 0,
      )
    ) {
      setError("Counted quantities must be zero or more.");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/inventory-count/${count.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: payloadItems,
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

  /**
   * Per-line control on an approved count: take one item out of the reports
   * (optionally putting its stock back) or restore it, leaving every other
   * line's reconciliation untouched.
   */
  async function lineAction(
    inventoryItemId: string,
    action: "exclude_keep_stock" | "exclude_revert_stock" | "restore",
  ) {
    if (
      action === "exclude_keep_stock" &&
      !window.confirm(
        "Drop this item from the reports? The stock stays exactly where this count put it — only its difference stops counting as a loss or gain.",
      )
    ) {
      return;
    }
    if (
      action === "exclude_revert_stock" &&
      !window.confirm(
        "Undo this item? Its stock and value go back to what they were before this count, and its difference leaves the reports.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/inventory-count/${count.id}/line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId, action }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Action failed");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  async function handleReview(action: "approve" | "reject" | "void") {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/inventory-count/${count.id}`, {
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

    router.push("/owner/inventory-count");
    router.refresh();
  }

  async function handleVoid() {
    if (
      !window.confirm(
        "Void this count and revert the stock? Every item goes back to the quantity and value it had before the count was approved.",
      )
    ) {
      return;
    }
    await handleReview("void");
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Remove this count record? The stock KEEPS the adjustment the count made — only the record (and its variance in reports) disappears.",
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/inventory-count/${count.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Delete failed");
      setLoading(false);
      return;
    }

    router.push("/owner/inventory-count");
    router.refresh();
  }

  function varianceCell(line: InventoryCountItemWithDetails) {
    const v = toStock(line.varianceBaseQty, line.basePerStock);
    if (v === 0) return <span className="text-ink-3">0</span>;
    const cls = v < 0 ? "text-rush-red" : "text-emerald-600";
    return (
      <span className={`font-semibold ${cls}`}>
        {v > 0 ? "+" : "−"}
        {Math.abs(v)} {line.stockUnit ?? ""}
      </span>
    );
  }

  function valueCell(line: InventoryCountItemWithDetails) {
    if (!isApproved) return <span className="text-ink-3">—</span>;
    if (line.valueFils === 0) return <span className="text-ink-3">0.000</span>;
    const cls = line.valueFils < 0 ? "text-rush-red" : "text-emerald-600";
    return (
      <span className={`font-semibold ${cls}`}>
        {line.valueFils > 0 ? "+" : "−"}
        {formatFils(Math.abs(line.valueFils))}
      </span>
    );
  }

  if (editing) {
    return (
      <div>
        {error && (
          <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Card className="mb-4 p-5">
          <Label htmlFor="effectiveOn">Apply losses to</Label>
          <Input
            id="effectiveOn"
            type="date"
            value={effectiveOn}
            onChange={(e) => setEffectiveOn(e.target.value)}
            className="max-w-[200px] font-mono"
          />
          <p className="text-ink-3 mt-2 text-xs">
            The month this count&apos;s shrinkage is reported in. Stock updates
            now regardless — set this to a past date when you are counting for a
            month that has already closed.
          </p>
        </Card>

        <Card className="overflow-hidden p-0">
          {lines.map((l, i) => (
            <div
              key={l.inventoryItemId}
              className={`flex items-center gap-3 px-5 py-3 ${
                i > 0 ? "border-line-2 border-t" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{l.name}</div>
                <div className="text-ink-3 text-xs">
                  {l.basePerStock !== 1 &&
                  l.countedStockQty.trim() !== "" &&
                  Number.isFinite(Number(l.countedStockQty))
                    ? `${Number(l.countedStockQty)} ${l.stockUnit} = ${round(
                        stockToBaseQty(
                          Number(l.countedStockQty),
                          l.basePerStock,
                        ),
                      )} ${l.baseUnit}`
                    : `Counted in ${l.stockUnit}`}
                </div>
              </div>
              <Input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={l.countedStockQty}
                onChange={(e) => updateLine(l.inventoryItemId, e.target.value)}
                placeholder="—"
                className="w-28 text-right font-mono"
                aria-label={`Counted ${l.name} in ${l.stockUnit}`}
              />
              <button
                type="button"
                onClick={() => removeLine(l.inventoryItemId)}
                className="text-ink-3 hover:text-rush-red shrink-0 rounded-lg p-2 transition-colors"
                aria-label={`Remove ${l.name} from this count`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </Card>

        {availableToAdd.length > 0 && (
          <Card className="mt-4 p-5">
            <Label htmlFor="addItem">Add an item the worker missed</Label>
            <Select
              id="addItem"
              value={addItemId}
              onChange={(e) => addLine(e.target.value)}
            >
              <option value="">Choose an item...</option>
              {availableToAdd.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.stockUnit})
                </option>
              ))}
            </Select>
          </Card>
        )}

        <p className="text-ink-3 mt-4 text-sm">
          {isApproved
            ? "Saving re-adjusts stock to the new counted amounts and re-dates the loss."
            : "Nothing is applied until you approve this count."}
        </p>

        <div className="mt-3 flex gap-2">
          <Button onClick={handleSave} disabled={loading}>
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
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {count.effectiveOn && (
        <p className="text-ink-3 mb-3 text-sm">
          Losses reported on{" "}
          <span className="text-ink font-semibold">{count.effectiveOn}</span>
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <div
          className={`text-ink-3 grid ${gridCols} gap-2 border-b border-line-2 px-5 py-3 text-[11px] font-bold tracking-wider uppercase`}
        >
          <div>Item</div>
          <div className="text-right">Expected</div>
          <div className="text-right">Counted</div>
          <div className="text-right">Variance</div>
          <div className="text-right">Value (BHD)</div>
          {isApproved && <div className="text-right">Actions</div>}
        </div>
        {count.items.map((line, i) => {
          const excluded = line.excludedAt !== null;
          return (
            <div
              key={line.id}
              className={`grid ${gridCols} items-center gap-2 px-5 py-3 text-sm ${
                i > 0 ? "border-line-2 border-t" : ""
              } ${excluded ? "opacity-55" : ""}`}
            >
              <div className="min-w-0 font-semibold">
                {line.itemName ?? "Item"}
                {line.stockUnit && (
                  <span className="text-ink-3 ml-1 text-xs font-normal">
                    ({line.stockUnit})
                  </span>
                )}
                {excluded && (
                  <span className="text-ink-3 mt-0.5 block text-[11px] font-normal">
                    Excluded ·{" "}
                    {line.excludedKeptStock
                      ? "stock kept as counted"
                      : "stock reverted"}
                  </span>
                )}
              </div>
              <div className="text-ink-2 text-right font-mono">
                {toStock(line.expectedBaseQty, line.basePerStock)}
              </div>
              <div className="text-right font-mono">
                {toStock(line.countedBaseQty, line.basePerStock)}
              </div>
              <div className="text-right font-mono">
                {excluded ? (
                  <span className="text-ink-3">—</span>
                ) : (
                  varianceCell(line)
                )}
              </div>
              <div className="text-right font-mono">
                {excluded ? (
                  <span className="text-ink-3">—</span>
                ) : (
                  valueCell(line)
                )}
              </div>
              {isApproved && (
                <div className="flex items-center justify-end gap-1">
                  {excluded ? (
                    <button
                      type="button"
                      onClick={() =>
                        lineAction(line.inventoryItemId, "restore")
                      }
                      disabled={loading}
                      className="text-navy rounded-lg px-2 py-1 text-xs font-semibold hover:underline"
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          lineAction(
                            line.inventoryItemId,
                            "exclude_keep_stock",
                          )
                        }
                        disabled={loading}
                        title="Keep the stock, drop this item from the reports"
                        aria-label={`Keep stock and drop ${line.itemName ?? "item"} from reports`}
                        className="text-ink-3 hover:text-navy rounded-lg p-1.5 transition-colors"
                      >
                        <EyeOff size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          lineAction(
                            line.inventoryItemId,
                            "exclude_revert_stock",
                          )
                        }
                        disabled={loading}
                        title="Undo this item — put its stock back too"
                        aria-label={`Undo ${line.itemName ?? "item"} and revert its stock`}
                        className="text-ink-3 hover:text-rush-red rounded-lg p-1.5 transition-colors"
                      >
                        <Undo2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {canEdit && (
        <div className="mt-4">
          <Button variant="secondary" onClick={startEditing} disabled={loading}>
            <Pencil size={16} className="mr-1" />
            Edit counts
          </Button>
        </div>
      )}

      {isPending && (
        <>
          <p className="text-ink-3 mt-4 text-sm">
            Approving sets each item&apos;s on-hand to the counted amount and
            revalues it at its current average cost. Shortages post a loss;
            overages add value.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => handleReview("approve")}
              disabled={loading}
            >
              <Check size={16} className="mr-1" />
              Approve &amp; reconcile
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleReview("reject")}
              disabled={loading}
              className="text-rush-red"
            >
              <X size={16} className="mr-1" />
              Reject
            </Button>
          </div>
        </>
      )}

      {isApproved && (
        <>
          <p className="text-ink-3 mt-4 text-sm">
            Per item, the eye icon drops one line from the reports while leaving
            its stock exactly as counted — for a difference that is not a real
            loss or gain, like finding stock you had already paid for. The undo
            arrow also puts that item&apos;s stock back. Everything else on the
            count is untouched either way.
          </p>
          <p className="text-ink-3 mt-2 text-sm">
            <span className="font-semibold">Remove record</span> keeps the stock
            where this count put it and only deletes the record (it stops
            counting in variance reports).{" "}
            <span className="font-semibold">Void &amp; revert</span> also puts
            the stock back to what it was before the count.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={handleDelete} disabled={loading}>
              <Trash2 size={16} className="mr-1" />
              Remove record (keep stock)
            </Button>
            <Button
              variant="secondary"
              onClick={handleVoid}
              disabled={loading}
              className="text-rush-red"
            >
              <Undo2 size={16} className="mr-1" />
              Void &amp; revert stock
            </Button>
          </div>
        </>
      )}

      {!isPending && !isApproved && (
        <div className="mt-3">
          <Button variant="secondary" onClick={handleDelete} disabled={loading}>
            <Trash2 size={16} className="mr-1" />
            Remove record
          </Button>
        </div>
      )}
    </div>
  );
}
