import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllProductsWithCosts } from "@/services/products";
import { getAllProductGroups } from "@/services/product-groups";
import { ProductsList } from "@/features/products/products-list";

export default async function ProductCostingPage() {
  const db = await createClient();
  await requireOwner(db);

  const [products, groups] = await Promise.all([
    getAllProductsWithCosts(db),
    getAllProductGroups(db),
  ]);
  return <ProductsList products={products} groups={groups} />;
}
