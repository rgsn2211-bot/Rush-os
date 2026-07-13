"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Product, ProductGroup } from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type ProductRow = Product & {
  costFils?: number;
  marginFils?: number;
  marginPct?: number;
};

interface ProductsListProps {
  products: ProductRow[];
  groups: ProductGroup[];
  /** Section the list lives in; links are built from it. */
  basePath?: string;
  /** Appended to the row link (pos-manager has no detail page, so "/edit"). */
  rowHrefSuffix?: string;
  /** Product groups stay owner-managed; hidden for the POS Manager. */
  showGroupsButton?: boolean;
}

// Sentinel key for products with no group; sorts after all real groups.
const UNGROUPED = "__ungrouped__";

export function ProductsList({
  products,
  groups,
  basePath = "/owner/products",
  rowHrefSuffix = "",
  showGroupsButton = true,
}: ProductsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  // Build the ordered list of sections: each group in sort order, then any
  // ungrouped products last. Only sections with matching products are shown.
  const sections: { key: string; name: string; rows: ProductRow[] }[] = [];
  for (const g of groups) {
    const rows = filtered.filter((p) => p.groupId === g.id);
    if (rows.length > 0) sections.push({ key: g.id, name: g.name, rows });
  }
  const ungrouped = filtered.filter(
    (p) => p.groupId == null || !groups.some((g) => g.id === p.groupId),
  );
  if (ungrouped.length > 0) {
    sections.push({ key: UNGROUPED, name: "Ungrouped", rows: ungrouped });
  }

  const columns: Column<ProductRow>[] = [
    {
      header: "Product",
      cell: (r) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{r.name}</span>
          </div>
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
        subtitle={`${products.length} products · grouped by type`}
        actions={
          <div className="flex gap-2">
            {showGroupsButton && (
              <Link href="/owner/products/groups">
                <Button variant="secondary">Manage groups</Button>
              </Link>
            )}
            <Link href={`${basePath}/new`}>
              <Button>Add Product</Button>
            </Link>
          </div>
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

      {sections.length === 0 ? (
        <EmptyState
          message={
            search
              ? "No products match your search."
              : "No products yet. Add your first product to see recipe costs and margins."
          }
          action={
            !search ? (
              <Link href={`${basePath}/new`}>
                <Button>Add Product</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.key}>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-ink text-sm font-bold">{section.name}</h2>
                <span className="text-ink-3 text-xs">
                  {section.rows.length}
                </span>
              </div>
              <Card className="p-0">
                <DataTable
                  columns={columns}
                  rows={section.rows}
                  onRowClick={(p) => router.push(`${basePath}/${p.id}${rowHrefSuffix}`)}
                />
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
