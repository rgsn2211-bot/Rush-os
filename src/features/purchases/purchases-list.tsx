"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Purchase } from "@/types/inventory";
import { formatFils } from "@/lib/calculations/currency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

interface PurchasesListProps {
  purchases: Purchase[];
  supplierNames: Record<string, string>;
}

const STAGE: Record<
  string,
  { label: string; variant: "default" | "amber" | "green" }
> = {
  ordered: { label: "Ordered", variant: "default" },
  needs_review: { label: "Awaiting review", variant: "amber" },
  approved: { label: "Received", variant: "green" },
};

export function PurchasesList({ purchases, supplierNames }: PurchasesListProps) {
  const router = useRouter();

  const columns: Column<Purchase>[] = [
    {
      header: "Date",
      cell: (r) => (
        <span className="font-semibold">
          {new Date(r.purchasedOn).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Supplier",
      cell: (r) => (
        <span className="text-ink-2">
          {r.supplierId ? (supplierNames[r.supplierId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      header: "Stage",
      cell: (r) => {
        const s = STAGE[r.status] ?? { label: r.status, variant: "default" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      header: "Total",
      align: "right",
      cell: (r) => (
        <span className="font-mono font-semibold">
          {r.status === "ordered" ? (
            <span className="text-ink-3">~{formatFils(r.totalFils)}</span>
          ) : (
            formatFils(r.totalFils)
          )}
        </span>
      ),
    },
    {
      header: "Payment",
      cell: (r) =>
        r.isPaid ? (
          <Badge variant="green">Paid</Badge>
        ) : (
          <Badge variant="amber">Unpaid</Badge>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle={`${purchases.length} recorded · order, receive & pay independently`}
        actions={
          <Link href="/owner/purchases/new">
            <Button>New Purchase</Button>
          </Link>
        }
      />

      {purchases.length === 0 ? (
        <EmptyState
          message="No purchases yet. Record a purchase to bring stock in and set real average costs."
          action={
            <Link href="/owner/purchases/new">
              <Button>Receive Stock</Button>
            </Link>
          }
        />
      ) : (
        <Card className="p-0">
          <DataTable
            columns={columns}
            rows={purchases}
            onRowClick={(p) => router.push(`/owner/purchases/${p.id}`)}
          />
        </Card>
      )}
    </div>
  );
}
