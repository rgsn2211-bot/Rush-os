"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InventoryItem } from "@/types/inventory";
import { formatFils, formatFilsRate } from "@/lib/calculations/currency";
import { effectiveUnitCostFils } from "@/lib/calculations/costing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

interface InventoryListProps {
  items: InventoryItem[];
}

export function InventoryList({ items }: InventoryListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const columns: Column<InventoryItem>[] = [
    {
      header: "Item",
      cell: (r) => (
        <div>
          <div className="font-semibold">{r.name}</div>
          {r.category && (
            <div className="text-ink-3 mt-0.5 text-xs">{r.category}</div>
          )}
        </div>
      ),
    },
    {
      header: "Stock",
      align: "right",
      cell: (r) => (
        <span className="font-mono font-semibold">
          {r.stockBaseQty} {r.baseUnit}
        </span>
      ),
    },
    {
      header: "Avg cost",
      align: "right",
      cell: (r) => {
        const avg = effectiveUnitCostFils(
          { baseQty: r.stockBaseQty, valueFils: r.stockValueFils },
          r.costingMethod,
          r.defaultCostFils,
        );
        return (
          <span className="text-ink-2 font-mono">
            {avg > 0 ? formatFilsRate(avg) : "—"}
          </span>
        );
      },
    },
    {
      header: "Stock value",
      align: "right",
      cell: (r) => (
        <span className="font-mono font-semibold">
          {r.stockValueFils > 0 ? formatFils(r.stockValueFils) : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (r) => {
        if (r.stockBaseQty <= r.minBaseQty && r.minBaseQty > 0) {
          return <Badge variant="red">Low</Badge>;
        }
        if (r.maxBaseQty && r.stockBaseQty > r.maxBaseQty) {
          return <Badge variant="blue">Over</Badge>;
        }
        return <Badge variant="green">OK</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} items`}
        actions={
          <Link href="/owner/inventory/new">
            <Button>Add Item</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            search
              ? "No items match your search."
              : "No inventory items yet. Add your first item to get started."
          }
          action={
            !search ? (
              <Link href="/owner/inventory/new">
                <Button>Add Item</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="p-0">
          <DataTable
            columns={columns}
            rows={filtered}
            onRowClick={(item) => router.push(`/owner/inventory/${item.id}`)}
          />
        </Card>
      )}
    </div>
  );
}
