import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { resolvePeriod } from "@/lib/dates";
import { getLossesReport } from "@/services/losses";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodPicker } from "@/components/ui/period-picker";
import { LossesView } from "@/features/losses/losses-view";

export default async function LossesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { from, to } = await searchParams;
  const period = resolvePeriod(from, to);
  const report = await getLossesReport(db, period);

  return (
    <div>
      <PageHeader
        title="Losses"
        subtitle="Waste, count shrinkage, giveaways and cash shortages for any period"
      />
      <div className="mb-5">
        <PeriodPicker
          fromInclusive={period.fromInclusive}
          toInclusive={period.toInclusive}
        />
      </div>
      <LossesView report={report} />
    </div>
  );
}
