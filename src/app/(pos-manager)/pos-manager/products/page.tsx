import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { getAllProductsWithCosts } from "@/services/products";
import { getAllProductGroups } from "@/services/product-groups";
import { ProductsList } from "@/features/products/products-list";

export default async function PosManagerProductsPage() {
  const db = await createClient();
  await requirePosManager(db);

  const [products, groups] = await Promise.all([
    getAllProductsWithCosts(db),
    getAllProductGroups(db),
  ]);
  return (
    <ProductsList
      products={products}
      groups={groups}
      basePath="/pos-manager/products"
      rowHrefSuffix="/edit"
      showGroupsButton={false}
    />
  );
}
