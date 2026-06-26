import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPendingPurchases } from "@/services/purchases";
import { getPendingComplimentary } from "@/services/complimentary";
import { getPendingWaste } from "@/services/waste";
import { getPendingClosings } from "@/services/daily-closing";
import { getPendingCashOuts } from "@/services/register-cash-out";
import { getPendingCounts } from "@/services/inventory-count";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewList } from "@/features/reviews/review-list";

export default async function ReviewPage() {
  const db = await createClient();
  await requireOwner(db);

  const [
    pending,
    pendingComp,
    pendingWaste,
    pendingClosings,
    pendingCashOuts,
    pendingCounts,
  ] = await Promise.all([
    getPendingPurchases(db),
    getPendingComplimentary(db),
    getPendingWaste(db),
    getPendingClosings(db),
    getPendingCashOuts(db),
    getPendingCounts(db),
  ]);

  const totalPending =
    pending.length +
    pendingComp.length +
    pendingWaste.length +
    pendingClosings.length +
    pendingCashOuts.length +
    pendingCounts.length;

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
        closings={pendingClosings}
        cashOuts={pendingCashOuts}
        inventoryCounts={pendingCounts}
      />
    </div>
  );
}
