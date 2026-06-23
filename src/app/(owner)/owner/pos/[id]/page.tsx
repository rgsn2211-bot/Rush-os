import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  getPosImport,
  listPosSalesRows,
  getImportSummary,
} from "@/repositories/pos-imports";
import { PageHeader } from "@/components/ui/page-header";
import { PosImportDetail } from "@/features/pos/pos-import-detail";
import Link from "next/link";

export default async function PosImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  const posImport = await getPosImport(db, id);
  if (!posImport) notFound();

  const [salesRows, summary] = await Promise.all([
    listPosSalesRows(db, id),
    getImportSummary(db, id),
  ]);

  return (
    <div>
      <Link
        href="/owner/pos"
        className="text-ink-3 hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        ← Back to POS Manager
      </Link>
      <PageHeader
        title={`Import — ${posImport.reportDate}`}
        subtitle={`${posImport.branch} · ${posImport.fileName}`}
      />
      <PosImportDetail
        posImport={posImport}
        salesRows={salesRows}
        summary={summary}
      />
    </div>
  );
}
