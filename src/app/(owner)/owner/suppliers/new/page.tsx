import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SupplierForm } from "@/features/suppliers/supplier-form";

export default async function NewSupplierPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <Link
        href="/owner/suppliers"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to suppliers
      </Link>
      <PageHeader title="Add Supplier" subtitle="Who you buy stock from" />
      <SupplierForm />
    </div>
  );
}
