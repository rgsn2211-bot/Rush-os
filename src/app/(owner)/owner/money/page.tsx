import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  getMoneySummary,
  getAllExpenses,
  getAllCashMovements,
  getApprovedPurchases,
  getAllSettlements,
  getCashFlowProjection,
  getAllRecurringCosts,
} from "@/services/money";
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
    suppliers,
    settlements,
    projection,
    recurringCosts,
  ] = await Promise.all([
    getMoneySummary(db),
    getAllExpenses(db),
    getAllCashMovements(db),
    getApprovedPurchases(db),
    getAllSuppliers(db),
    getAllSettlements(db),
    getCashFlowProjection(db),
    getAllRecurringCosts(db),
  ]);

  const supplierNames = new Map(suppliers.map((s) => [s.id, s.name]));
  const purchaseRows: PurchaseRow[] = purchases.map((p) => ({
    id: p.id,
    supplierName: p.supplierId
      ? supplierNames.get(p.supplierId) ?? "Unknown supplier"
      : "Cash purchase",
    purchasedOn: p.purchasedOn,
    isPaid: p.isPaid,
    dueDate: p.dueDate,
    totalFils: p.totalFils,
  }));

  return (
    <MoneyDashboard
      summary={summary}
      expenses={expenses}
      cashMovements={cashMovements}
      purchases={purchaseRows}
      settlements={settlements}
      projection={projection}
      recurringCosts={recurringCosts}
    />
  );
}
