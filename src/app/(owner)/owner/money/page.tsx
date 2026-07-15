import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  getMoneySummary,
  getAllExpenses,
  getAllCashMovements,
  getApprovedPurchases,
  getPayables,
  getAllSettlements,
  getSettlementLedgers,
  getCashFlowProjection,
  getAllRecurringCosts,
} from "@/services/money";
import type { Purchase } from "@/types/inventory";
import { getAllSuppliers } from "@/services/suppliers";
import { MoneyDashboard } from "@/features/money/money-dashboard";
import type { PurchaseRow } from "@/features/money/types";

export default async function MoneyPage() {
  const db = await createClient();
  await requireOwner(db);

  const [
    summary,
    expenses,
    cashMovements,
    purchases,
    payables,
    suppliers,
    settlements,
    ledgers,
    projection,
    recurringCosts,
  ] = await Promise.all([
    getMoneySummary(db),
    getAllExpenses(db),
    getAllCashMovements(db),
    getApprovedPurchases(db),
    getPayables(db),
    getAllSuppliers(db),
    getAllSettlements(db),
    getSettlementLedgers(db),
    getCashFlowProjection(db),
    getAllRecurringCosts(db),
  ]);

  const supplierNames = new Map(suppliers.map((s) => [s.id, s.name]));
  const toRow = (p: Purchase): PurchaseRow => ({
    id: p.id,
    supplierName: p.supplierId
      ? supplierNames.get(p.supplierId) ?? "Unknown supplier"
      : "Cash purchase",
    purchasedOn: p.purchasedOn,
    isPaid: p.isPaid,
    paidMethod: p.paidMethod,
    dueDate: p.dueDate,
    totalFils: p.totalFils,
    status: p.status,
  });

  return (
    <MoneyDashboard
      summary={summary}
      expenses={expenses}
      cashMovements={cashMovements}
      purchases={purchases.map(toRow)}
      payables={payables.map(toRow)}
      settlements={settlements}
      ledgers={ledgers}
      projection={projection}
      recurringCosts={recurringCosts}
    />
  );
}
