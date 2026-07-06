import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { getAllItems } from "@/services/inventory";
import { InventoryList } from "@/features/inventory/inventory-list";

export default async function PosManagerInventoryPage() {
  const db = await createClient();
  await requirePosManager(db);

  const items = await getAllItems(db);
  return (
    <InventoryList
      items={items}
      basePath="/pos-manager/inventory"
      rowHrefSuffix="/edit"
      showStockValue={false}
    />
  );
}
