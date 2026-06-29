import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { getExpiryAlerts } from "@/services/alerts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function WorkerAlertsPage() {
  const db = await createClient();
  await requireWorker(db);

  const admin = createAdminClient();
  const [items, expiry] = await Promise.all([
    listInventoryItemsOps(db),
    getExpiryAlerts(admin),
  ]);
  const lowStock = items.filter(
    (i) => i.minBaseQty > 0 && i.stockBaseQty <= i.minBaseQty,
  );

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/worker"
          className="text-ink-3 mb-2 inline-flex items-center gap-1 text-sm font-medium hover:text-ink"
        >
          ← Back
        </Link>
        <h1 className="text-ink text-xl font-bold">Inventory Alerts</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Low, expiring and expired items
        </p>
      </div>

      <h2 className="text-ink mb-3 text-base font-bold">
        Expiring &amp; expired{" "}
        <span className="text-ink-3 text-sm font-normal">({expiry.length})</span>
      </h2>

      {expiry.length === 0 ? (
        <EmptyState message="Nothing is expiring soon." />
      ) : (
        <div className="mb-7 flex flex-col gap-3">
          {expiry.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-[15px] font-semibold">{a.title}</div>
                  <div className="text-ink-2 mt-1 text-sm">{a.detail}</div>
                </div>
                <Badge variant={a.type === "expired" ? "red" : "amber"}>
                  {a.type === "expired" ? "Expired" : "Expiring"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

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
