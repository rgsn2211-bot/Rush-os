"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PosImport, PosSalesRow } from "@/types/pos";
import { formatFils } from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import Link from "next/link";

interface ImportDetailProps {
  posImport: PosImport;
  salesRows: PosSalesRow[];
  summary: {
    mappedCount: number;
    unmappedCount: number;
    needsReviewCount: number;
    ignoredCount: number;
  };
}

export function PosImportDetail({
  posImport,
  salesRows,
  summary,
}: ImportDetailProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [result, setResult] = useState<{
    deductions?: { inventoryItemName: string; baseQtyDeducted: number; cogsFils: number }[];
    alreadyDeducted?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProcess() {
    setProcessing(true);
    setError(null);

    const res = await fetch(`/api/pos/imports/${posImport.id}/process`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Processing failed");
    } else {
      setResult(data);
    }

    setProcessing(false);
    router.refresh();
  }

  async function handleVoid() {
    if (!confirm("Void this import? Inventory deductions will be reversed."))
      return;

    setVoiding(true);
    setError(null);

    const res = await fetch(`/api/pos/imports/${posImport.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Void failed");
      setVoiding(false);
    } else {
      router.push("/owner/pos");
      router.refresh();
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "mapped":
        return <Badge variant="green">Mapped</Badge>;
      case "unmapped":
        return <Badge variant="amber">Unmapped</Badge>;
      case "needs_review":
        return <Badge variant="red">Needs review</Badge>;
      case "ignored":
        return <Badge variant="default">Ignored</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  const totalQty = salesRows.reduce((s, r) => s + r.qtySold, 0);
  const totalFils = salesRows.reduce((s, r) => s + r.amountFils, 0);

  return (
    <div>
      {/* Summary card */}
      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-ink-3 text-xs font-medium uppercase">Date</div>
              <div className="mt-0.5 font-semibold">{posImport.reportDate}</div>
            </div>
            <div>
              <div className="text-ink-3 text-xs font-medium uppercase">Branch</div>
              <div className="mt-0.5 font-semibold">{posImport.branch}</div>
            </div>
            <div>
              <div className="text-ink-3 text-xs font-medium uppercase">
                Items
              </div>
              <div className="mt-0.5 font-semibold">{salesRows.length}</div>
            </div>
            <div>
              <div className="text-ink-3 text-xs font-medium uppercase">
                Status
              </div>
              <div className="mt-0.5">
                <Badge
                  variant={
                    posImport.status === "processed"
                      ? "green"
                      : posImport.status === "pending"
                        ? "amber"
                        : "red"
                  }
                >
                  {posImport.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-line mt-4 flex items-center gap-4 border-t pt-4 text-sm">
            <span className="text-ink-3">
              Mapped: <strong className="text-green-600">{summary.mappedCount}</strong>
            </span>
            <span className="text-ink-3">
              Unmapped: <strong className="text-amber-500">{summary.unmappedCount}</strong>
            </span>
            <span className="text-ink-3">
              Review: <strong className="text-rush-red">{summary.needsReviewCount}</strong>
            </span>
            <span className="text-ink-3">
              Ignored: <strong>{summary.ignoredCount}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Guidance */}
      {posImport.status === "pending" && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  This import cannot deduct inventory yet
                </div>
                <p className="mt-1 text-sm text-amber-700">
                  {summary.unmappedCount > 0 && (
                    <>{summary.unmappedCount} item{summary.unmappedCount !== 1 ? "s are" : " is"} unmapped. </>
                  )}
                  {summary.needsReviewCount > 0 && (
                    <>{summary.needsReviewCount} item{summary.needsReviewCount !== 1 ? "s need" : " needs"} a recipe. </>
                  )}
                  Go to the{" "}
                  <Link href="/owner/pos" className="font-semibold underline">
                    POS Items tab
                  </Link>{" "}
                  to map or ignore them. The status will update automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {posImport.status === "processed" && !posImport.inventoryDeducted && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Check size={20} className="shrink-0 text-green-600" />
                <div className="text-sm font-semibold text-green-800">
                  All items resolved — ready to deduct inventory
                </div>
              </div>
              <Button onClick={handleProcess} disabled={processing} size="sm">
                {processing ? "Processing..." : "Deduct Inventory"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {posImport.status !== "voided" && (
        <div className="mb-4 flex gap-3">
          {posImport.status === "processed" && !posImport.inventoryDeducted && (
            <Button onClick={handleProcess} disabled={processing}>
              {processing ? "Processing..." : "Deduct Inventory"}
            </Button>
          )}
          {posImport.inventoryDeducted && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <Check size={16} /> Inventory already deducted
            </div>
          )}
          <Button
            variant="secondary"
            onClick={handleVoid}
            disabled={voiding}
            className="text-rush-red"
          >
            <Trash2 size={16} className="mr-1.5" />
            {voiding ? "Voiding..." : "Void Import"}
          </Button>
        </div>
      )}

      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {result && !result.alreadyDeducted && result.deductions && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-base font-bold text-green-600">
              <Check size={18} /> Inventory Deducted
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5 text-sm">
              {result.deductions.map((d, i) => (
                <div key={i} className="flex justify-between">
                  <span>{d.inventoryItemName}</span>
                  <span className="text-ink-2 font-mono">
                    −{d.baseQtyDeducted} · COGS {formatFils(d.cogsFils)} BHD
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales rows */}
      <Card>
        <CardHeader>
          <div className="text-base font-bold">
            Sales Rows ({salesRows.length})
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line-2 border-b">
                  <th className="text-ink-3 px-5 py-3 text-left text-xs font-semibold uppercase">
                    POS ID
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-left text-xs font-semibold uppercase">
                    Item
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-left text-xs font-semibold uppercase">
                    Category
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-right text-xs font-semibold uppercase">
                    Qty
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-right text-xs font-semibold uppercase">
                    Amount
                  </th>
                  <th className="text-ink-3 px-5 py-3 text-left text-xs font-semibold uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-line-2 border-b last:border-0"
                  >
                    <td className="px-5 py-3 font-mono text-xs">
                      #{row.posItemId}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {row.posItemName}
                    </td>
                    <td className="text-ink-2 px-5 py-3">{row.category}</td>
                    <td className="px-5 py-3 text-right font-mono">
                      {row.qtySold}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {formatFils(row.amountFils)}
                    </td>
                    <td className="px-5 py-3">{statusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-line-2 border-t bg-gray-50">
                  <td className="px-5 py-3 font-semibold" colSpan={3}>
                    Total
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">
                    {totalQty}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">
                    {formatFils(totalFils)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
