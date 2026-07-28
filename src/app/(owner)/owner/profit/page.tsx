import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { resolvePeriod } from "@/lib/dates";
import { getProfitReport } from "@/services/profit";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodPicker } from "@/components/ui/period-picker";
import { ProfitReportView } from "@/features/profit/profit-report-view";

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { from, to } = await searchParams;
  const period = resolvePeriod(from, to);
  const report = await getProfitReport(db, period);

  return (
    <div>
      <PageHeader
        title="Profit Reports"
        subtitle="Revenue, COGS, expenses and net profit for any period"
      />
      <div className="mb-5">
        <PeriodPicker
          fromInclusive={period.fromInclusive}
          toInclusive={period.toInclusive}
        />
      </div>
      <ProfitReportView report={report} />
    </div>
  );
}
