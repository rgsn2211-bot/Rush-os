import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllComplimentaryLogs } from "@/services/complimentary";
import { PageHeader } from "@/components/ui/page-header";
import { ComplimentaryList } from "@/features/complimentary/complimentary-list";

export default async function ComplimentaryPage() {
  const db = await createClient();
  await requireOwner(db);

  const logs = await getAllComplimentaryLogs(db);

  return (
    <div>
      <PageHeader
        title="Complimentary"
        subtitle="Review worker-submitted complimentary items"
      />
      <ComplimentaryList logs={logs} />
    </div>
  );
}
