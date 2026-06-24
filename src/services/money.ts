import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CashMovement,
  ExpenseWithLines,
  MoneySummary,
} from "@/types/money";
import type { Purchase } from "@/types/inventory";
import type {
  ExpenseCreateInput,
  CashMovementCreateInput,
} from "@/lib/validators/money";
import { bhdToFils } from "@/lib/calculations/currency";
import {
  insertExpense,
  listExpenses,
  deleteExpense,
  sumExpensesBetween,
} from "@/repositories/expenses";
import {
  insertCashMovement,
  listCashMovements,
  deleteCashMovement,
  getCashPosition,
} from "@/repositories/cash-movements";
import { listPurchases, markPurchasePaid } from "@/repositories/purchases";

// ---------- Expenses --------------------------------------------------------

export async function recordExpense(
  db: SupabaseClient,
  input: ExpenseCreateInput,
  createdBy: string,
): Promise<ExpenseWithLines> {
  const lines = input.lines.map((l) => ({
    category: l.category,
    amountFils: bhdToFils(l.amountBhd),
    description: l.description,
  }));
  const totalFils = lines.reduce((sum, l) => sum + l.amountFils, 0);

  return insertExpense(db, {
    spentOn: input.spentOn,
    method: input.method,
    note: input.note,
    totalFils,
    createdBy,
    lines,
  });
}

export async function getAllExpenses(
  db: SupabaseClient,
): Promise<ExpenseWithLines[]> {
  return listExpenses(db);
}

export async function removeExpense(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteExpense(db, id);
}

// ---------- Cash movements --------------------------------------------------

export async function recordCashMovement(
  db: SupabaseClient,
  input: CashMovementCreateInput,
  createdBy: string,
): Promise<CashMovement> {
  return insertCashMovement(db, {
    direction: input.direction,
    reason: input.reason,
    amountFils: bhdToFils(input.amountBhd),
    method: input.method,
    occurredOn: input.occurredOn,
    affectsPl: input.affectsPl,
    note: input.note,
    createdBy,
  });
}

export async function getAllCashMovements(
  db: SupabaseClient,
): Promise<CashMovement[]> {
  return listCashMovements(db);
}

export async function removeCashMovement(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteCashMovement(db, id);
}

// ---------- Purchases (payables) --------------------------------------------

/** Approved purchases (the confirmed money-out ledger). */
export async function getApprovedPurchases(
  db: SupabaseClient,
): Promise<Purchase[]> {
  const all = await listPurchases(db);
  return all.filter((p) => p.status === "approved");
}

/** Approved + unpaid purchases — money the shop still owes suppliers. */
export async function getPayables(db: SupabaseClient): Promise<Purchase[]> {
  const approved = await getApprovedPurchases(db);
  return approved.filter((p) => !p.isPaid);
}

export async function payPurchase(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  await markPurchasePaid(db, id);
}

// ---------- Overview summary ------------------------------------------------

function monthBounds(now = new Date()): { from: string; to: string } {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export async function getMoneySummary(
  db: SupabaseClient,
): Promise<MoneySummary> {
  const { from, to } = monthBounds();

  const [cashPositionFils, payables, expensesMonthFils, approvedPurchases] =
    await Promise.all([
      getCashPosition(db),
      getPayables(db),
      sumExpensesBetween(db, from, to),
      getApprovedPurchases(db),
    ]);

  const payablesFils = payables.reduce((sum, p) => sum + p.totalFils, 0);
  const inventoryPurchasesMonthFils = approvedPurchases
    .filter((p) => p.purchasedOn >= from && p.purchasedOn < to)
    .reduce((sum, p) => sum + p.totalFils, 0);

  return {
    cashPositionFils,
    payablesFils,
    expensesMonthFils,
    inventoryPurchasesMonthFils,
  };
}
