import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPendingPurchases } from "@/services/purchases";
import { getPendingComplimentary } from "@/services/complimentary";
import { getPendingWaste } from "@/services/waste";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewList } from "@/features/reviews/review-list";

export default async function ReviewPage() {
  const db = await createClient();
  await requireOwner(db);

  const [pending, pendingComp, pendingWaste] = await Promise.all([
    getPendingPurchases(db),
    getPendingComplimentary(db),
    getPendingWaste(db),
  ]);

  const totalPending =
    pending.length + pendingComp.length + pendingWaste.length;

  return (
    <div>
      <PageHeader
        title="Review Center"
        subtitle={
          totalPending > 0
            ? `${totalPending} item${totalPending !== 1 ? "s" : ""} waiting for your decision`
            : "All caught up"
        }
      />
      <ReviewList
        purchases={pending}
        complimentaryLogs={pendingComp}
        wasteLogs={pendingWaste}
      />
    </div>
  );
}
