import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllClosings } from "@/services/daily-closing";
import { PageHeader } from "@/components/ui/page-header";
import { ClosingList } from "@/features/closing/closing-list";

export default async function ClosingPage() {
  const db = await createClient();
  await requireOwner(db);

  const closings = await getAllClosings(db);

  return (
    <div>
      <PageHeader
        title="Daily Closing"
        subtitle="Review and approve worker end-of-day submissions"
      />
      <ClosingList closings={closings} />
    </div>
  );
}
