import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryItem, InventoryItemOps } from "@/types/inventory";
import { getAllItems } from "@/services/inventory";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { listPendingPurchases, listExpiringStock } from "@/repositories/purchases";

/** How many days before an item expires we start warning. */
export const EXPIRY_WARN_DAYS = 7;
/** How long after expiry we keep showing the alert (then assume it's dealt with). */
const EXPIRY_GRACE_DAYS = 30;

export interface Alert {
  id: string;
  type: "low_stock" | "pending_review" | "expiring" | "expired";
  title: string;
  detail: string;
  link: string;
}

export interface ExpiryAlert {
  id: string;
  type: "expiring" | "expired";
  title: string;
  detail: string;
  itemId: string;
  expiryDate: string;
  daysUntil: number;
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Expiry alerts: for each in-stock item with a tracked expiry date within the
 * warning window (or expired in the last grace period), the earliest expiring
 * lot. `db` must be able to read purchase_items + inventory_items (owner client,
 * or the service-role client for worker screens).
 */
export async function getExpiryAlerts(
  db: SupabaseClient,
): Promise<ExpiryAlert[]> {
  const today = todayIso();
  const from = (() => {
    const d = new Date();
    d.setDate(d.getDate() - EXPIRY_GRACE_DAYS);
    return d.toISOString().split("T")[0];
  })();
  const to = (() => {
    const d = new Date();
    d.setDate(d.getDate() + EXPIRY_WARN_DAYS);
    return d.toISOString().split("T")[0];
  })();

  const rows = await listExpiringStock(db, from, to);

  // Earliest expiring lot per item (rows already sorted by expiry ascending).
  const earliest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!earliest.has(r.inventoryItemId)) earliest.set(r.inventoryItemId, r);
  }

  return [...earliest.values()].map((r) => {
    const daysUntil = daysBetween(today, r.expiryDate);
    const expired = daysUntil < 0;
    return {
      id: `expiry-${r.inventoryItemId}`,
      type: expired ? "expired" : "expiring",
      title: expired ? `${r.name} has expired` : `${r.name} expires soon`,
      detail: expired
        ? `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} ago (${r.expiryDate})`
        : daysUntil === 0
          ? `Expires today (${r.expiryDate})`
          : `Expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"} (${r.expiryDate})`,
      itemId: r.inventoryItemId,
      expiryDate: r.expiryDate,
      daysUntil,
    };
  });
}

export async function getOwnerAlerts(db: SupabaseClient): Promise<Alert[]> {
  const [items, pending, expiry] = await Promise.all([
    getAllItems(db),
    listPendingPurchases(db),
    getExpiryAlerts(db),
  ]);

  const alerts: Alert[] = [];

  for (const e of expiry) {
    alerts.push({
      id: e.id,
      type: e.type,
      title: e.title,
      detail: e.detail,
      link: `/owner/inventory/${e.itemId}`,
    });
  }

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
