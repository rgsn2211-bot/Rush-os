import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { ReceiveForm } from "@/features/worker/receive-form";

export default async function WorkerReceivePage() {
  const db = await createClient();
  await requireWorker(db);

  const [items, suppliers] = await Promise.all([
    listInventoryItemsOps(db),
    getAllSuppliers(db),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-ink text-xl font-bold">Receive Inventory</h1>
        <p className="text-ink-3 mt-1 text-[14px]">
          Log a supplier delivery or cash purchase
        </p>
      </div>
      <ReceiveForm inventoryItems={items} suppliers={suppliers} />
    </div>
  );
}
