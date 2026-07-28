import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getWasteDetails } from "@/services/waste";
import { PageHeader } from "@/components/ui/page-header";
import { WasteDetail } from "@/features/waste/waste-detail";

export default async function WasteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  const log = await getWasteDetails(db, id);
  if (!log) notFound();

  return (
    <div>
      <Link
        href="/owner/waste"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to waste
      </Link>
      <PageHeader
        title={`Waste · ${log.itemName ?? "Item"}`}
        subtitle={new Date(log.createdAt).toLocaleDateString()}
      />
      <div className="max-w-xl">
        <WasteDetail log={log} />
      </div>
    </div>
  );
}
