import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllSuppliers } from "@/services/suppliers";
import { SuppliersList } from "@/features/suppliers/suppliers-list";

export default async function SuppliersPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const suppliers = await getAllSuppliers(db);
  return <SuppliersList suppliers={suppliers} />;
}
