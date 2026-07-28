import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getAccountBalance, getAllBalanceAdjustments } from "@/services/money";
import { PageHeader } from "@/components/ui/page-header";
import { BalanceAdjust } from "@/features/money/balance-adjust";

export default async function AdjustBalancePage() {
  const db = await createClient();
  await requireOwner(db);

  const [registerBalanceFils, bankBalanceFils, adjustments] = await Promise.all([
    getAccountBalance(db, "register"),
    getAccountBalance(db, "bank"),
    getAllBalanceAdjustments(db),
  ]);

  return (
    <div>
      <Link
        href="/owner/money"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to Money
      </Link>
      <PageHeader
        title="Adjust Balances"
        subtitle="Count the real money, enter it, and the app fixes the difference — every check is logged"
      />
      <BalanceAdjust
        registerBalanceFils={registerBalanceFils}
        bankBalanceFils={bankBalanceFils}
        adjustments={adjustments}
      />
    </div>
  );
}
