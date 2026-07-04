import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllProductGroups } from "@/services/product-groups";
import { ProductGroupsManager } from "@/features/products/product-groups-manager";

export default async function ProductGroupsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const groups = await getAllProductGroups(db);
  return <ProductGroupsManager groups={groups} />;
}
