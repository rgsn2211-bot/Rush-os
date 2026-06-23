import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryItem, InventoryItemOps } from "@/types/inventory";
import { getAllItems } from "@/services/inventory";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { listPendingPurchases } from "@/repositories/purchases";

export interface Alert {
  id: string;
  type: "low_stock" | "pending_review";
  title: string;
  detail: string;
  link: string;
}

export async function getOwnerAlerts(db: SupabaseClient): Promise<Alert[]> {
  const [items, pending] = await Promise.all([
    getAllItems(db),
    listPendingPurchases(db),
  ]);

  const alerts: Alert[] = [];

  for (const item of items) {
    if (item.minBaseQty > 0 && item.stockBaseQty <= item.minBaseQty) {
      alerts.push({
        id: `low-${item.id}`,
        type: "low_stock",
        title: `${item.name} is low`,
        detail: `${item.stockBaseQty} ${item.baseUnit} on hand (min ${item.minBaseQty})`,
        link: `/owner/inventory/${item.id}`,
      });
    }
  }

  if (pending.length > 0) {
    alerts.push({
      id: "pending-reviews",
      type: "pending_review",
      title: `${pending.length} purchase${pending.length > 1 ? "s" : ""} awaiting review`,
      detail: "Worker submissions need your approval",
      link: "/owner/review",
    });
  }

  return alerts;
}

export interface WorkerAlert {
  id: string;
  type: "low_stock";
  title: string;
  detail: string;
  itemId: string;
}

export async function getWorkerAlerts(
  db: SupabaseClient,
): Promise<WorkerAlert[]> {
  const items = await listInventoryItemsOps(db);
  const alerts: WorkerAlert[] = [];

  for (const item of items) {
    if (item.minBaseQty > 0 && item.stockBaseQty <= item.minBaseQty) {
      alerts.push({
        id: `low-${item.id}`,
        type: "low_stock",
        title: `${item.name} is low`,
        detail: `${item.stockBaseQty} ${item.baseUnit} on hand (min ${item.minBaseQty})`,
        itemId: item.id,
      });
    }
  }

  return alerts;
}

export function countLowStock(
  items: (InventoryItem | InventoryItemOps)[],
): number {
  return items.filter((i) => i.minBaseQty > 0 && i.stockBaseQty <= i.minBaseQty)
    .length;
}
