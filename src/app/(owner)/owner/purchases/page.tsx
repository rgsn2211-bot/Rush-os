import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllPurchases } from "@/services/purchases";
import { getAllSuppliers } from "@/services/suppliers";
import { PurchasesList } from "@/features/purchases/purchases-list";

export default async function PurchasesPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const [purchases, suppliers] = await Promise.all([
    getAllPurchases(db),
    getAllSuppliers(db),
  ]);

  const supplierNames = Object.fromEntries(
    suppliers.map((s) => [s.id, s.name]),
  );

  return <PurchasesList purchases={purchases} supplierNames={supplierNames} />;
}
