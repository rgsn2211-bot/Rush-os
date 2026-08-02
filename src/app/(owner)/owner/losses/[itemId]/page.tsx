import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { resolvePeriod } from "@/lib/dates";
import { getItemLossDetail } from "@/services/losses";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodPicker } from "@/components/ui/period-picker";
import { ItemLossDetailView } from "@/features/losses/item-loss-detail";

export default async function ItemLossPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { itemId } = await params;
  const { from, to } = await searchParams;
  const period = resolvePeriod(from, to);

  const detail = await getItemLossDetail(db, itemId, period);
  if (!detail) notFound();

  return (
    <div>
      <Link
        href={`/owner/losses?from=${period.fromInclusive}&to=${period.toInclusive}`}
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to Losses
      </Link>

      <PageHeader
        title={detail.name}
        subtitle="Every recorded movement for this item, and which of them count as a loss"
      />

      <div className="mb-5">
        <PeriodPicker
          fromInclusive={period.fromInclusive}
          toInclusive={period.toInclusive}
        />
      </div>

      <ItemLossDetailView detail={detail} />
    </div>
  );
}
