import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function WorkerAlertsPage() {
  const db = await createClient();
  await requireWorker(db);

  const items = await listInventoryItemsOps(db);
  const lowStock = items.filter(
    (i) => i.minBaseQty > 0 && i.stockBaseQty <= i.minBaseQty,
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-ink text-xl font-bold">Inventory Alerts</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Low and expiring items
        </p>
      </div>

      <h2 className="text-ink mb-3 text-base font-bold">
        Low stock{" "}
        <span className="text-ink-3 text-sm font-normal">({lowStock.length})</span>
      </h2>

      {lowStock.length === 0 ? (
        <EmptyState message="Nothing is low on stock right now." />
      ) : (
        <div className="flex flex-col gap-3">
          {lowStock.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-[15px] font-semibold">{item.name}</div>
                  {item.category && (
                    <div className="text-ink-3 text-xs">{item.category}</div>
                  )}
                  <div className="text-ink-2 mt-1 text-sm">
                    <span className="font-mono">
                      {item.stockBaseQty} {item.baseUnit}
                    </span>{" "}
                    on hand · min{" "}
                    <span className="font-mono">
                      {item.minBaseQty} {item.baseUnit}
                    </span>
                  </div>
                </div>
                <Badge variant="red">Low</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
