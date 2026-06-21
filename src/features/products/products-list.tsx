"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

interface ProductsListProps {
  products: (Product & {
    costFils?: number;
    marginFils?: number;
    marginPct?: number;
  })[];
}

export function ProductsList({ products }: ProductsListProps) {
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const columns: Column<ProductsListProps["products"][number]>[] = [
    {
      header: "Product",
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
      header: "Selling price",
      align: "right",
      cell: (r) => (
        <span className="font-mono font-semibold">
          {formatFils(r.priceFils)}
        </span>
      ),
    },
    {
      header: "Recipe cost",
      align: "right",
      cell: (r) => (
        <span className="text-ink-2 font-mono">
          {r.costFils != null ? formatFils(r.costFils) : "—"}
        </span>
      ),
    },
    {
      header: "Gross margin",
      align: "right",
      cell: (r) => (
        <span className="font-mono font-semibold text-rush-green">
          {r.marginFils != null ? formatFils(r.marginFils) : "—"}
        </span>
      ),
    },
    {
      header: "Margin %",
      align: "right",
      cell: (r) => {
        if (r.marginPct == null) return <span className="text-ink-3">—</span>;
        const variant =
          r.marginPct >= 70 ? "green" : r.marginPct >= 60 ? "amber" : "red";
        return <Badge variant={variant}>{Math.round(r.marginPct)}%</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Product Costing"
        subtitle={`${products.length} products · each size/variant is its own product`}
        actions={
          <Link href="/owner/products/new">
            <Button>Add Product</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            search
              ? "No products match your search."
              : "No products yet. Add your first product to see recipe costs and margins."
          }
          action={
            !search ? (
              <Link href="/owner/products/new">
                <Button>Add Product</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="p-0">
          <DataTable
            columns={columns}
            rows={filtered}
            onRowClick={() => {}}
          />
        </Card>
      )}
    </div>
  );
}
