import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getCountWithItems } from "@/services/inventory-count";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { InventoryCountDetail } from "@/features/inventory-count/inventory-count-detail";

export default async function InventoryCountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  const count = await getCountWithItems(db, id);
  if (!count) notFound();

  function statusBadge(status: string) {
    switch (status) {
      case "needs_review":
        return <Badge variant="amber">Pending</Badge>;
      case "approved":
        return <Badge variant="green">Approved</Badge>;
      case "voided":
        return <Badge variant="red">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  return (
    <div>
      <Link
        href="/owner/inventory-count"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to Inventory Counts
      </Link>

      <PageHeader
        title={`Count · ${new Date(count.countedAt).toLocaleDateString()}`}
        subtitle={`${count.submitterName ?? "Unknown"} · ${count.items.length} item${
          count.items.length !== 1 ? "s" : ""
        }${count.notes ? ` · ${count.notes}` : ""}`}
        actions={statusBadge(count.status)}
      />

      <InventoryCountDetail count={count} />
    </div>
  );
}
