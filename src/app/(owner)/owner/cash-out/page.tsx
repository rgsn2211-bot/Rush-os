import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAllCashOuts } from "@/services/register-cash-out";
import { PageHeader } from "@/components/ui/page-header";
import { CashOutList } from "@/features/cash-out/cash-out-list";

export default async function OwnerCashOutPage() {
  const db = await createClient();
  await requireOwner(db);

  const cashOuts = await getAllCashOuts(db);

  return (
    <div>
      <PageHeader
        title="Register Cash Out"
        subtitle="Review worker cash-outs; approving lowers the register balance"
      />
      <CashOutList cashOuts={cashOuts} />
    </div>
  );
}
