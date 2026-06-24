import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CashMovement,
  ExpenseWithLines,
  MoneySummary,
  Settlement,
  CashFlowProjection,
} from "@/types/money";
import type { Purchase } from "@/types/inventory";
import type {
  ExpenseCreateInput,
  CashMovementCreateInput,
  SettlementCreateInput,
  SettlementConfirmInput,
  RecurringCostCreateInput,
} from "@/lib/validators/money";
import type { RecurringCost } from "@/types/money";
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
import {
  insertSettlement,
  listSettlements,
  getSettlement,
  confirmSettlementReceived,
  deleteSettlement,
  sumPendingSettlements,
} from "@/repositories/settlements";
import {
  insertRecurringCost,
  listRecurringCosts,
  getRecurringCost,
  updateRecurringCost,
  deleteRecurringCost,
} from "@/repositories/recurring-costs";

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

// ---------- Recurring / upcoming costs --------------------------------------

export async function recordRecurringCost(
  db: SupabaseClient,
  input: RecurringCostCreateInput,
  createdBy: string,
): Promise<RecurringCost> {
  return insertRecurringCost(db, {
    name: input.name,
    costType: input.costType,
    amountFils: bhdToFils(input.amountBhd),
    frequency: input.frequency,
    nextDueDate: input.nextDueDate,
    defaultMethod: input.defaultMethod,
    createdBy,
  });
}

export async function getAllRecurringCosts(
  db: SupabaseClient,
): Promise<RecurringCost[]> {
  return listRecurringCosts(db);
}

export async function removeRecurringCost(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteRecurringCost(db, id);
}

/** Advance an ISO date by a recurring frequency. */
function advanceDueDate(
  isoDate: string,
  frequency: RecurringCost["frequency"],
): string {
  const d = new Date(isoDate + "T00:00:00Z");
  if (frequency === "Weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (frequency === "Monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString().split("T")[0];
}

/**
 * Mark a recurring cost paid: record a real expense for it, then advance the
 * next due date (Weekly/Monthly) or deactivate it (One-time). "On invoice"
 * costs keep their due date — they recur on an unknown cadence.
 */
export async function markRecurringPaid(
  db: SupabaseClient,
  id: string,
  createdBy: string,
): Promise<void> {
  const cost = await getRecurringCost(db, id);
  if (!cost) throw new Error("Recurring cost not found");

  await insertExpense(db, {
    spentOn: new Date().toISOString().split("T")[0],
    method: cost.defaultMethod,
    note: `${cost.name} (recurring)`,
    totalFils: cost.amountFils,
    createdBy,
    lines: [
      {
        category: cost.costType,
        amountFils: cost.amountFils,
        description: cost.frequency,
      },
    ],
  });

  if (cost.frequency === "One-time") {
    await updateRecurringCost(db, id, { active: false });
  } else if (cost.frequency === "Weekly" || cost.frequency === "Monthly") {
    await updateRecurringCost(db, id, {
      nextDueDate: advanceDueDate(cost.nextDueDate, cost.frequency),
    });
  }
}

// ---------- Settlements -----------------------------------------------------

export async function recordSettlement(
  db: SupabaseClient,
  input: SettlementCreateInput,
  createdBy: string,
): Promise<Settlement> {
  return insertSettlement(db, {
    channel: input.channel,
    platform: input.platform,
    periodLabel: input.periodLabel,
    expectedFils: bhdToFils(input.expectedBhd),
    feeFils: input.feeBhd === undefined ? undefined : bhdToFils(input.feeBhd),
    note: input.note,
    createdBy,
  });
}

export async function getAllSettlements(
  db: SupabaseClient,
): Promise<Settlement[]> {
  return listSettlements(db);
}

export async function confirmSettlement(
  db: SupabaseClient,
  id: string,
  input: SettlementConfirmInput,
): Promise<void> {
  const existing = await getSettlement(db, id);
  if (!existing) throw new Error("Settlement not found");
  if (existing.status === "received") {
    throw new Error("Settlement already confirmed");
  }
  await confirmSettlementReceived(
    db,
    id,
    bhdToFils(input.actualBhd),
    input.feeBhd === undefined ? existing.feeFils : bhdToFils(input.feeBhd),
    input.receivedOn,
  );
}

export async function removeSettlement(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteSettlement(db, id);
}

/**
 * Projected cash: what's in the till now (cash log net), plus money owed to us
 * by providers (pending settlements), minus what we owe suppliers (payables).
 * Cash flow follows money received/paid — not sales dates.
 */
export async function getCashFlowProjection(
  db: SupabaseClient,
): Promise<CashFlowProjection> {
  const [availableNowFils, expectedIncomingFils, payables] = await Promise.all([
    getCashPosition(db),
    sumPendingSettlements(db),
    getPayables(db),
  ]);

  const upcomingOutgoingFils = payables.reduce(
    (sum, p) => sum + p.totalFils,
    0,
  );

  return {
    availableNowFils,
    expectedIncomingFils,
    upcomingOutgoingFils,
    projectedFils:
      availableNowFils + expectedIncomingFils - upcomingOutgoingFils,
  };
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
