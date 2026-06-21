import { createClient } from "@/lib/supabase/server";
import { getAllProducts } from "@/services/products";
import { ProductsList } from "@/features/products/products-list";

export default async function ProductCostingPage() {
  const db = await createClient();
  const products = await getAllProducts(db);

  return <ProductsList products={products} />;
}
