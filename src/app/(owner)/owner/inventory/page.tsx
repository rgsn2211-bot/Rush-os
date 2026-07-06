import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllItems } from "@/services/inventory";
import { InventoryList } from "@/features/inventory/inventory-list";

export default async function InventoryPage() {
  const db = await createClient();
  await requireOwner(db);

  const items = await getAllItems(db);
  return <InventoryList items={items} />;
}
