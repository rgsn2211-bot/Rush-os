"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Supplier } from "@/types/inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

interface SuppliersListProps {
  suppliers: Supplier[];
}

export function SuppliersList({ suppliers }: SuppliersListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<Supplier>[] = [
    {
      header: "Supplier",
      cell: (r) => <div className="font-semibold">{r.name}</div>,
    },
    {
      header: "Lead time",
      align: "right",
      cell: (r) => (
        <span className="text-ink-2 font-mono">
          {r.leadTimeDays} {r.leadTimeDays === 1 ? "day" : "days"}
        </span>
      ),
    },
    {
      header: "Notes",
      cell: (r) => (
        <span className="text-ink-3 line-clamp-1 text-sm">{r.notes || "—"}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers`}
        actions={
          <Link href="/owner/suppliers/new">
            <Button>Add Supplier</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            search
              ? "No suppliers match your search."
              : "No suppliers yet. Add your first supplier so you can assign it to inventory items and purchases."
          }
          action={
            !search ? (
              <Link href="/owner/suppliers/new">
                <Button>Add Supplier</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="p-0">
          <DataTable
            columns={columns}
            rows={filtered}
            onRowClick={(s) => router.push(`/owner/suppliers/${s.id}`)}
          />
        </Card>
      )}
    </div>
  );
}
