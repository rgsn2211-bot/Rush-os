import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPendingPurchases } from "@/services/purchases";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewList } from "@/features/reviews/review-list";

export default async function ReviewPage() {
  const db = await createClient();
  await requireOwner(db);

  const pending = await getPendingPurchases(db);

  return (
    <div>
      <PageHeader
        title="Review Center"
        subtitle={
          pending.length > 0
            ? `${pending.length} item${pending.length !== 1 ? "s" : ""} waiting for your decision`
            : "All caught up"
        }
      />
      <ReviewList purchases={pending} />
    </div>
  );
}
