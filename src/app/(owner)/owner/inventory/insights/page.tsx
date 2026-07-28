import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getInventoryInsights } from "@/services/inventory-insights";
import { PageHeader } from "@/components/ui/page-header";
import { InsightsView } from "@/features/inventory/insights-view";

export default async function InventoryInsightsPage() {
  const db = await createClient();
  await requireOwner(db);

  const insights = await getInventoryInsights(db);

  return (
    <div>
      <PageHeader
        title="Inventory Insights"
        subtitle="Consumption rates, stock-out predictions, and reorder suggestions"
      />
      <InsightsView insights={insights} />
    </div>
  );
}
