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
  CashTransferInput,
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
  getRegisterBalance,
  getBankBalance,
  deleteCashMovementsBySource,
} from "@/repositories/cash-movements";
import {
  listPurchases,
  getPurchase,
  markPurchasePaid,
} from "@/repositories/purchases";
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

function expenseMethodToAccount(method: string): "register" | "bank" {
  return method === "Cash" ? "register" : "bank";
}

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
  const account = expenseMethodToAccount(input.method);

  const expense = await insertExpense(db, {
    spentOn: input.spentOn,
    method: input.method,
    account,
    note: input.note,
    totalFils,
    createdBy,
    lines,
  });

  if (totalFils > 0) {
    await insertCashMovement(db, {
      direction: "out",
      reason: `Expense — ${input.method}`,
      amountFils: totalFils,
      method: input.method,
      occurredOn: input.spentOn,
      affectsPl: true,
      account,
      sourceType: "expense",
      sourceId: expense.id,
      createdBy,
    });
  }

  return expense;
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
  await deleteCashMovementsBySource(db, "expense", id);
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
    account: input.account,
    note: input.note,
    createdBy,
  });
}

/**
 * Move cash from the register to the bank (a deposit). Recorded as two linked
 * movements: register `out` + bank `in`. Total money is unchanged; only the
 * register/bank split shifts.
 */
export async function transferToBank(
  db: SupabaseClient,
  input: CashTransferInput,
  createdBy: string,
): Promise<void> {
  const amountFils = bhdToFils(input.amountBhd);
  await insertCashMovement(db, {
    direction: "out",
    reason: "Deposit to bank",
    amountFils,
    method: "Cash",
    occurredOn: input.occurredOn,
    affectsPl: false,
    account: "register",
    note: input.note,
    createdBy,
  });
  await insertCashMovement(db, {
    direction: "in",
    reason: "Deposit from register",
    amountFils,
    method: "Bank transfer",
    occurredOn: input.occurredOn,
    affectsPl: false,
    account: "bank",
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
  paidMethod: "cash" | "bank",
  createdBy: string,
): Promise<void> {
  const purchase = await getPurchase(db, id);
  if (!purchase) throw new Error("Purchase not found");
  if (purchase.isPaid) throw new Error("Purchase is already paid");

  await markPurchasePaid(db, id, paidMethod);

  const account = paidMethod === "cash" ? "register" : "bank";
  if (purchase.totalFils > 0) {
    await insertCashMovement(db, {
      direction: "out",
      reason: "Purchase payment",
      amountFils: purchase.totalFils,
      method: paidMethod === "cash" ? "Cash" : "Bank transfer",
      occurredOn: new Date().toISOString().split("T")[0],
      affectsPl: false,
      account,
      sourceType: "purchase_payment",
      sourceId: id,
      createdBy,
    });
  }
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

  const account = expenseMethodToAccount(cost.defaultMethod);
  const spentOn = new Date().toISOString().split("T")[0];
  const expense = await insertExpense(db, {
    spentOn,
    method: cost.defaultMethod,
    account,
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

  if (cost.amountFils > 0) {
    await insertCashMovement(db, {
      direction: "out",
      reason: `Expense — ${cost.defaultMethod}`,
      amountFils: cost.amountFils,
      method: cost.defaultMethod,
      occurredOn: spentOn,
      affectsPl: true,
      account,
      sourceType: "expense",
      sourceId: expense.id,
      createdBy,
    });
  }

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
  createdBy: string,
): Promise<void> {
  const existing = await getSettlement(db, id);
  if (!existing) throw new Error("Settlement not found");
  if (existing.status === "received") {
    throw new Error("Settlement already confirmed");
  }
  const actualFils = bhdToFils(input.actualBhd);
  await confirmSettlementReceived(
    db,
    id,
    actualFils,
    input.feeBhd === undefined ? existing.feeFils : bhdToFils(input.feeBhd),
    input.receivedOn,
  );

  // Money has arrived in the bank — post it so total money updates.
  if (actualFils > 0) {
    await insertCashMovement(db, {
      direction: "in",
      reason: `Settlement received — ${existing.platform ?? existing.channel}`,
      amountFils: actualFils,
      method: "Bank transfer",
      occurredOn: input.receivedOn,
      affectsPl: false,
      account: "bank",
      sourceType: "settlement",
      sourceId: id,
      createdBy,
    });
  }
}

/**
 * Reconcile several pending settlements at once (e.g. all of one platform's
 * days, paid together). The owner enters the total actually received; it is
 * distributed across the selected settlements proportionally to expected, and
 * the shortfall on each becomes its fee/commission. One bank cash-in is posted
 * for the total received.
 */
export async function reconcileSettlements(
  db: SupabaseClient,
  ids: string[],
  receivedTotalBhd: number,
  receivedOn: string,
  createdBy: string,
): Promise<void> {
  if (ids.length === 0) throw new Error("Select at least one settlement");

  const settlements: Settlement[] = [];
  for (const id of ids) {
    const s = await getSettlement(db, id);
    if (!s) throw new Error("Settlement not found");
    if (s.status === "received") {
      throw new Error("A selected settlement is already received");
    }
    settlements.push(s);
  }

  const receivedTotalFils = bhdToFils(receivedTotalBhd);
  const expectedTotal = settlements.reduce((sum, s) => sum + s.expectedFils, 0);

  let allocated = 0;
  for (let i = 0; i < settlements.length; i++) {
    const s = settlements[i];
    const isLast = i === settlements.length - 1;
    // Last row absorbs the rounding remainder so shares sum to the total.
    const share = isLast
      ? receivedTotalFils - allocated
      : expectedTotal > 0
        ? Math.round((receivedTotalFils * s.expectedFils) / expectedTotal)
        : 0;
    allocated += share;
    const feeFils = Math.max(0, s.expectedFils - share);
    await confirmSettlementReceived(db, s.id, share, feeFils, receivedOn);
  }

  if (receivedTotalFils > 0) {
    const dayCount = settlements.length;
    await insertCashMovement(db, {
      direction: "in",
      reason: `Settlement payout (${dayCount} day${dayCount !== 1 ? "s" : ""})`,
      amountFils: receivedTotalFils,
      method: "Bank transfer",
      occurredOn: receivedOn,
      affectsPl: false,
      account: "bank",
      sourceType: "settlement_reconcile",
      createdBy,
    });
  }
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

  const [
    registerBalanceFils,
    bankBalanceFils,
    payables,
    expensesMonthFils,
    approvedPurchases,
  ] = await Promise.all([
    getRegisterBalance(db),
    getBankBalance(db),
    getPayables(db),
    sumExpensesBetween(db, from, to),
    getApprovedPurchases(db),
  ]);

  const totalMoneyFils = registerBalanceFils + bankBalanceFils;
  const payablesFils = payables.reduce((sum, p) => sum + p.totalFils, 0);
  const inventoryPurchasesMonthFils = approvedPurchases
    .filter((p) => p.purchasedOn >= from && p.purchasedOn < to)
    .reduce((sum, p) => sum + p.totalFils, 0);

  return {
    cashPositionFils: totalMoneyFils,
    registerBalanceFils,
    bankBalanceFils,
    totalMoneyFils,
    payablesFils,
    expensesMonthFils,
    inventoryPurchasesMonthFils,
  };
}
