import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllProductGroups } from "@/services/product-groups";
import { ProductGroupsManager } from "@/features/products/product-groups-manager";

export default async function ProductGroupsPage() {
  const db = await createClient();
  await requireOwner(db);

  const groups = await getAllProductGroups(db);
  return <ProductGroupsManager groups={groups} />;
}
