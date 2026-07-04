"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReviewStatus } from "@/types/inventory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

export interface WorkerSubmissionRow {
  id: string;
  name: string;
  subtitle?: string;
  status: ReviewStatus;
}

/**
 * The full catalog of items or products for a worker. Every row can be edited or
 * deleted; deleting voids the row (owner reviews edits). Cost is never shown.
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
  const [search, setSearch] = useState("");

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Delete "${name}"? It will be removed from the lists. The owner can still see it was voided.`,
      )
    )
      return;
    setBusyId(id);
    const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Link href={addHref} className="ml-auto">
          <Button>{addLabel}</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={emptyText} />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nothing matches your search." />
      ) : (
        <Card className="p-0">
          {filtered.map((r, i) => {
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
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
