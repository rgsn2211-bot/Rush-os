import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupplierById } from "@/services/suppliers";
import { PageHeader } from "@/components/ui/page-header";
import { SupplierForm } from "@/features/suppliers/supplier-form";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const supplier = await getSupplierById(db, id);
  if (!supplier) notFound();

  return (
    <div>
      <Link
        href={`/owner/suppliers/${id}`}
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to {supplier.name}
      </Link>
      <PageHeader title={`Edit ${supplier.name}`} subtitle="Update supplier details" />
      <SupplierForm supplier={supplier} />
    </div>
  );
}
