import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import {
  listPurchasesOps,
  getPurchaseItemsOps,
} from "@/repositories/worker-purchases";
import { getAllSuppliers } from "@/services/suppliers";
import { OrdersView, type OrderRow } from "@/features/worker/orders-view";

export default async function WorkerOrdersPage() {
  const db = await createClient();
  await requireWorker(db);

  const [orders, items, suppliers] = await Promise.all([
    listPurchasesOps(db),
    listInventoryItemsOps(db),
    getAllSuppliers(db),
  ]);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  // Line detail is only needed to receive an order, so fetch it for open ones.
  const rows: OrderRow[] = await Promise.all(
    orders.map(async (o) => {
      const lines =
        o.status === "ordered" ? await getPurchaseItemsOps(db, o.id) : [];
      return {
        id: o.id,
        supplierName: o.supplierId
          ? (supplierMap.get(o.supplierId) ?? "Unknown supplier")
          : "No supplier",
        purchasedOn: o.purchasedOn,
        status: o.status,
        isPaid: o.isPaid,
        dueDate: o.dueDate,
        lines: lines.map((l) => {
          const item = itemMap.get(l.inventoryItemId);
          return {
            purchaseItemId: l.id,
            name: item?.name ?? "Item",
            purchaseUnit: item?.purchaseUnit ?? "unit",
            expiry: item?.expiry ?? ("not_needed" as const),
            expectedQty: l.purchaseQty,
            expiryDate: l.expiryDate,
          };
        }),
      };
    }),
  );

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/worker"
          className="text-ink-3 hover:text-ink mb-2 inline-flex items-center gap-1 text-sm font-medium"
        >
          ← Back
        </Link>
        <h1 className="text-ink text-xl font-bold">Orders</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Place an order or mark an incoming delivery received
        </p>
      </div>
      <OrdersView orders={rows} items={items} suppliers={suppliers} />
    </div>
  );
}
