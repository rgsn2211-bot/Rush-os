import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllWaste } from "@/services/waste";
import { PageHeader } from "@/components/ui/page-header";
import { WasteList } from "@/features/waste/waste-list";

export default async function WastePage() {
  const db = await createClient();
  await requireOwner(db);

  const logs = await getAllWaste(db);

  return (
    <div>
      <PageHeader
        title="Waste"
        subtitle="Review worker-submitted waste; approving deducts stock"
      />
      <WasteList logs={logs} />
    </div>
  );
}
