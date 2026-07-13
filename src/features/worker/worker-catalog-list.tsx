"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

export interface WorkerCatalogRow {
  id: string;
  name: string;
  subtitle?: string;
}

/**
 * Read-only catalog of items or products for a worker: search + rows, no
 * actions. Authoring lives with the owner and the POS Manager; cost is never
 * shown here.
 */
export function WorkerCatalogList({
  rows,
  emptyText,
}: {
  rows: WorkerCatalogRow[];
  emptyText: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState message={emptyText} />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nothing matches your search." />
      ) : (
        <Card className="p-0">
          {filtered.map((r, i) => (
            <div
              key={r.id}
              className={`px-5 py-4 ${i > 0 ? "border-line-2 border-t" : ""}`}
            >
              <div className="text-[15px] font-bold">{r.name}</div>
              {r.subtitle && (
                <div className="text-ink-3 mt-0.5 text-[13px]">
                  {r.subtitle}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
