import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { resolvePeriod } from "@/lib/dates";
import { getCountReport } from "@/services/count-report";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodPicker } from "@/components/ui/period-picker";
import { CountsReport } from "@/features/inventory-count/counts-report";

export default async function CountReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { from, to } = await searchParams;
  const period = resolvePeriod(from, to);
  const report = await getCountReport(db, period);

  return (
    <div>
      <Link
        href="/owner/inventory-count"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to Inventory Counts
      </Link>

      <PageHeader
        title="Count Report"
        subtitle="Every count in the period with its differences, by the date the losses apply to"
      />

      <div className="mb-5">
        <PeriodPicker
          fromInclusive={period.fromInclusive}
          toInclusive={period.toInclusive}
        />
      </div>

      <CountsReport report={report} />
    </div>
  );
}
