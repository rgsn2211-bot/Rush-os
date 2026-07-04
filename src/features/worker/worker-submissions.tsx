"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReviewStatus } from "@/types/inventory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export interface WorkerSubmissionRow {
  id: string;
  name: string;
  subtitle?: string;
  status: ReviewStatus;
}

/**
 * A worker's own submissions (items or products). Pending rows can be edited or
 * deleted; once the owner has approved, the row is read-only.
 */
export function WorkerSubmissions({
  rows,
  editBase,
  apiBase,
  addHref,
  addLabel,
  emptyText,
}: {
  rows: WorkerSubmissionRow[];
  /** e.g. "/worker/inventory" — edit link is `${editBase}/${id}/edit`. */
  editBase: string;
  /** e.g. "/api/worker/inventory" — delete hits `${apiBase}/${id}`. */
  apiBase: string;
  addHref: string;
  addLabel: string;
  emptyText: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setBusyId(id);
    const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={addHref}>
          <Button>{addLabel}</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={emptyText} />
      ) : (
        <Card className="p-0">
          {rows.map((r, i) => {
            const pending = r.status === "needs_review";
            return (
              <div
                key={r.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold">{r.name}</span>
                    {pending ? (
                      <Badge variant="amber">Pending review</Badge>
                    ) : (
                      <Badge variant="green">Approved</Badge>
                    )}
                  </div>
                  {r.subtitle && (
                    <div className="text-ink-3 mt-0.5 text-[13px]">
                      {r.subtitle}
                    </div>
                  )}
                </div>
                {pending && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`${editBase}/${r.id}/edit`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => remove(r.id, r.name)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
