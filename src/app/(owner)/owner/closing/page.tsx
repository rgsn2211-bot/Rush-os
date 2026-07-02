import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllClosings } from "@/services/daily-closing";
import { getPlatformsForWorker } from "@/services/delivery";
import { todayInBahrain } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { ClosingList } from "@/features/closing/closing-list";

export default async function ClosingPage() {
  const db = await createClient();
  await requireOwner(db);

  const [closings, platforms] = await Promise.all([
    getAllClosings(db),
    getPlatformsForWorker(db),
  ]);

  return (
    <div>
      <PageHeader
        title="Daily Closing"
        subtitle="Review, edit, and back-fill end-of-day closings"
      />
      <ClosingList
        closings={closings}
        platforms={platforms}
        today={todayInBahrain()}
      />
    </div>
  );
}
