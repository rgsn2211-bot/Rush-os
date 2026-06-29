import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllCounts } from "@/services/inventory-count";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryCountList } from "@/features/inventory-count/inventory-count-list";

export default async function InventoryCountPage() {
  const db = await createClient();
  await requireOwner(db);

  const counts = await getAllCounts(db);

  return (
    <div>
      <PageHeader
        title="Inventory Counts"
        subtitle="Review worker stock counts; approving reconciles on-hand to the counted amount"
      />
      <InventoryCountList counts={counts} />
    </div>
  );
}
