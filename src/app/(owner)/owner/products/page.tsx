import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllProductsWithCosts } from "@/services/products";
import { ProductsList } from "@/features/products/products-list";

export default async function ProductCostingPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const products = await getAllProductsWithCosts(db);
  return <ProductsList products={products} />;
}
