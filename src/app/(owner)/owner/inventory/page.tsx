import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllItems } from "@/services/inventory";
import { InventoryList } from "@/features/inventory/inventory-list";

export default async function InventoryPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const items = await getAllItems(db);
  return <InventoryList items={items} />;
}
