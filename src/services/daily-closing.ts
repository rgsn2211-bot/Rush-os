import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyClosing,
  DailyClosingWithSubmitter,
  ClosingReviewDetails,
} from "@/types/closing";
import type {
  DailyClosingCreateInput,
  DailyClosingUpdateInput,
} from "@/lib/validators/closing";
import { bhdToFils } from "@/lib/calculations/currency";
import { todayInBahrain } from "@/lib/dates";
import {
  insertDailyClosing,
  insertDeliveryClosingLines,
  getDeliveryClosingLines,
  deleteDeliveryClosingLines,
  listDailyClosings,
  listPendingDailyClosings,
  listNonVoidedClosingDates,
  getDailyClosingByDate,
  getDailyClosing,
  updateDailyClosing,
  updateDailyClosingStatus,
  updateDailyClosingReconciliation,
  deleteDailyClosing,
} from "@/repositories/daily-closing";
import {
  insertCashMovement,
  getRegisterBalance,
  getRegisterBalanceBefore,
  deleteCashMovementsBySource,
} from "@/repositories/cash-movements";
import {
  insertSettlement,
  listSettlementsByClosing,
  deletePendingSettlementsByClosing,
} from "@/repositories/settlements";
import { listRegisterCashOutsForDate } from "@/repositories/register-cash-outs";
import { listCashPurchasesForDate } from "@/repositories/purchases";
import { listWasteLogsForDate } from "@/repositories/waste";
import { listComplimentaryLogsForDate } from "@/repositories/complimentary";
import { getPlatforms, platformFeeFils } from "@/services/delivery";

/** Current net register cash (in − out across all dates), in fils. */
export async function getRegisterCashBalance(
  db: SupabaseClient,
): Promise<number> {
  return getRegisterBalance(db);
}

/**
 * Cash that left the register on a given date (in fils): worker/owner register
 * cash-outs (purchases + withdrawals) plus cash-paid inventory purchases. Read
 * from their own source tables so it's stable regardless of owner-approval
 * order — the cash physically left the drawer when the worker recorded it.
 */
export async function getCashOutForDate(
  db: SupabaseClient,
  date: string,
): Promise<number> {
  const [cashOuts, cashPurchases] = await Promise.all([
    listRegisterCashOutsForDate(db, date),
    listCashPurchasesForDate(db, date),
  ]);
  const cashOutsFils = cashOuts.reduce((s, c) => s + c.amountFils, 0);
  const purchasesFils = cashPurchases.reduce((s, p) => s + p.totalFils, 0);
  return cashOutsFils + purchasesFils;
}

/**
 * Expected cash in the drawer at end of day:
 *   opening register cash (carried over from before today)
 *   + today's cash sales
 *   − cash that left the register today (purchases + withdrawals).
 * `db` must be able to read cash_movements / purchases (owner client, or the
 * service-role client when called from a worker-triggered route).
 */
export async function computeExpectedCashFils(
  db: SupabaseClient,
  reportDate: string,
  cashSalesFils: number,
): Promise<number> {
  const [openingFils, cashOutFils] = await Promise.all([
    getRegisterBalanceBefore(db, reportDate),
    getCashOutForDate(db, reportDate),
  ]);
  return openingFils + cashSalesFils - cashOutFils;
}

export interface ClosingFigures {
  discountFils: number;
  cashSalesFils: number;
  cardSalesFils: number;
  benefitpaySalesFils: number;
  deliverySalesFils: number;
  grossSalesFils: number;
  totalOrders: number;
  cashCountedFils: number;
  /** Per-platform lines converted to fils (before the >0 filter). */
  deliveryLines: { platformId: string; salesFils: number; orders: number }[];
}

/**
 * Convert the BHD figures a closing carries into integer fils and derive the
 * totals (delivery sales, gross sales, total orders). Shared by create and edit
 * so both compute the stored numbers the exact same way.
 */
export function computeClosingFigures(
  input: DailyClosingUpdateInput,
): ClosingFigures {
  const cashSalesFils = bhdToFils(input.cashSalesBhd);
  const cardSalesFils = bhdToFils(input.cardSalesBhd);
  const benefitpaySalesFils = bhdToFils(input.benefitpaySalesBhd);

  const deliveryLines = input.deliveryLines.map((l) => ({
    platformId: l.platformId,
    salesFils: bhdToFils(l.salesBhd),
    orders: l.orders,
  }));
  const deliverySalesFils = deliveryLines.reduce(
    (sum, l) => sum + l.salesFils,
    0,
  );
  const deliveryOrders = deliveryLines.reduce((sum, l) => sum + l.orders, 0);

  return {
    discountFils: bhdToFils(input.discountBhd),
    cashSalesFils,
    cardSalesFils,
    benefitpaySalesFils,
    deliverySalesFils,
    grossSalesFils:
      cashSalesFils + cardSalesFils + benefitpaySalesFils + deliverySalesFils,
    totalOrders:
      input.cashOrders +
      input.cardOrders +
      input.benefitpayOrders +
      deliveryOrders,
    cashCountedFils: bhdToFils(input.cashCountedBhd),
    deliveryLines,
  };
}

/**
 * Submit an end-of-day closing (worker via the wizard, or owner back-filling a
 * missed day). Money arrives in BHD and is converted to fils here. The expected
 * drawer cash is computed by the caller (it needs to read the cash log, which
 * workers can't) and passed in; the variance is counted minus expected. Created
 * as needs_review; one non-voided closing per date, and never a future date.
 */
export async function submitDailyClosing(
  db: SupabaseClient,
  input: DailyClosingCreateInput,
  createdBy: string,
  cashExpectedFils: number,
): Promise<DailyClosing> {
  if (input.reportDate > todayInBahrain()) {
    throw new Error("Cannot close a future date");
  }

  const existing = await getDailyClosingByDate(db, input.reportDate);
  if (existing) {
    throw new Error("A closing for this date already exists");
  }

  const f = computeClosingFigures(input);

  const closing = await insertDailyClosing(db, {
    reportDate: input.reportDate,
    totalOrders: f.totalOrders,
    discountFils: f.discountFils,
    cashSalesFils: f.cashSalesFils,
    cashOrders: input.cashOrders,
    cardSalesFils: f.cardSalesFils,
    cardOrders: input.cardOrders,
    benefitpaySalesFils: f.benefitpaySalesFils,
    benefitpayOrders: input.benefitpayOrders,
    deliverySalesFils: f.deliverySalesFils,
    grossSalesFils: f.grossSalesFils,
    cashCountedFils: f.cashCountedFils,
    cashExpectedFils,
    cashVarianceFils: f.cashCountedFils - cashExpectedFils,
    notes: input.notes,
    createdBy,
  });

  // Only persist platforms actually entered (sales or orders > 0).
  const linesToSave = f.deliveryLines.filter(
    (l) => l.salesFils > 0 || l.orders > 0,
  );
  await insertDeliveryClosingLines(db, closing.id, linesToSave);

  return closing;
}

/**
 * Owner edits an existing closing's figures. Recomputes all totals and the
 * drawer reconciliation against the current cash log. Editing an already-approved
 * day rewrites its posted money effects: the register cash-in and the auto-created
 * settlements are reversed and re-posted with the new numbers. If any of those
 * settlements was already reconciled (received into the bank), the edit is blocked
 * so the bank balance can't be corrupted. The report date is immutable.
 */
export async function updateClosing(
  db: SupabaseClient,
  id: string,
  input: DailyClosingUpdateInput,
  editedBy: string,
): Promise<DailyClosing> {
  const closing = await getDailyClosing(db, id);
  if (!closing) throw new Error("Closing not found");
  if (closing.status === "voided") {
    throw new Error("Cannot edit a rejected closing");
  }

  const f = computeClosingFigures(input);
  const cashExpectedFils = await computeExpectedCashFils(
    db,
    closing.reportDate,
    f.cashSalesFils,
  );

  const wasApproved = closing.status === "approved";
  if (wasApproved) {
    const settlements = await listSettlementsByClosing(db, id);
    if (settlements.some((s) => s.status === "received")) {
      throw new Error(
        "This day's card, BenefitPay or delivery money has already been reconciled. Undo the reconciliation before editing this closing.",
      );
    }
    // Reverse the previously posted effects; they are re-posted below.
    await deleteCashMovementsBySource(db, "daily_closing", id);
    await deletePendingSettlementsByClosing(db, id);
  }

  const updated = await updateDailyClosing(db, id, {
    totalOrders: f.totalOrders,
    discountFils: f.discountFils,
    cashSalesFils: f.cashSalesFils,
    cashOrders: input.cashOrders,
    cardSalesFils: f.cardSalesFils,
    cardOrders: input.cardOrders,
    benefitpaySalesFils: f.benefitpaySalesFils,
    benefitpayOrders: input.benefitpayOrders,
    deliverySalesFils: f.deliverySalesFils,
    grossSalesFils: f.grossSalesFils,
    cashCountedFils: f.cashCountedFils,
    cashExpectedFils,
    cashVarianceFils: f.cashCountedFils - cashExpectedFils,
    notes: input.notes,
  });

  // Replace the per-platform delivery lines with the edited set.
  await deleteDeliveryClosingLines(db, id);
  const linesToSave = f.deliveryLines.filter(
    (l) => l.salesFils > 0 || l.orders > 0,
  );
  await insertDeliveryClosingLines(db, id, linesToSave);

  // Re-post money for an approved day (reads the delivery lines just written).
  if (wasApproved) {
    await postApprovalEffects(db, updated, editedBy);
  }

  return updated;
}

export async function getAllClosings(
  db: SupabaseClient,
): Promise<DailyClosingWithSubmitter[]> {
  return listDailyClosings(db);
}

export async function getPendingClosings(
  db: SupabaseClient,
): Promise<DailyClosingWithSubmitter[]> {
  return listPendingDailyClosings(db);
}

export async function getClosingForDate(
  db: SupabaseClient,
  reportDate: string,
): Promise<DailyClosing | null> {
  return getDailyClosingByDate(db, reportDate);
}

/** Dates (YYYY-MM-DD) that already have a non-voided closing. */
export async function getNonVoidedClosingDates(
  db: SupabaseClient,
): Promise<string[]> {
  return listNonVoidedClosingDates(db);
}

export async function deleteOwnClosing(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const closing = await getDailyClosing(db, id);
  if (!closing) throw new Error("Closing not found");
  if (closing.createdBy !== userId) {
    throw new Error("You can only delete your own closing");
  }
  if (closing.status !== "needs_review") {
    throw new Error("Can only delete a pending closing");
  }
  await deleteDailyClosing(db, id);
}

/**
 * Owner reviews a closing. Approving finalizes it as the official record for the
 * day AND moves money: the day's cash sales land in the register, and pending
 * settlements ("money I should receive") are created per channel/platform.
 * Rejecting voids it (the worker can then resubmit a corrected closing).
 * No inventory effect — Daily EOD is the revenue record, not a stock movement.
 */
export async function reviewClosing(
  db: SupabaseClient,
  id: string,
  action: "approve" | "reject",
  reviewedBy: string,
): Promise<void> {
  const closing = await getDailyClosing(db, id);
  if (!closing) throw new Error("Closing not found");
  if (closing.status !== "needs_review") {
    throw new Error("Closing is not pending review");
  }

  if (action === "reject") {
    await updateDailyClosingStatus(db, id, "voided", reviewedBy);
    return;
  }

  // Re-freeze the drawer reconciliation as the official record: cash-outs may
  // have been added/approved since the worker submitted, so recompute against
  // the current cash log (the owner client can read it).
  const expectedFils = await computeExpectedCashFils(
    db,
    closing.reportDate,
    closing.cashSalesFils,
  );
  await updateDailyClosingReconciliation(
    db,
    id,
    expectedFils,
    closing.cashCountedFils - expectedFils,
  );

  await updateDailyClosingStatus(db, id, "approved", reviewedBy);
  await postApprovalEffects(db, closing, reviewedBy);
}

/**
 * Everything the owner needs to review one day's closing: the drawer
 * reconciliation plus the day's waste, complimentary items, register cash-outs,
 * cash purchases and delivery lines. Read with an owner (or service-role) client.
 */
export async function getClosingReviewDetails(
  db: SupabaseClient,
  closingId: string,
): Promise<ClosingReviewDetails> {
  const closing = await getDailyClosing(db, closingId);
  if (!closing) throw new Error("Closing not found");

  const date = closing.reportDate;
  const [
    openingRegisterFils,
    cashOutTodayFils,
    deliveryLines,
    waste,
    complimentary,
    cashOuts,
    cashPurchases,
  ] = await Promise.all([
    getRegisterBalanceBefore(db, date),
    getCashOutForDate(db, date),
    getDeliveryClosingLines(db, closingId),
    listWasteLogsForDate(db, date),
    listComplimentaryLogsForDate(db, date),
    listRegisterCashOutsForDate(db, date),
    listCashPurchasesForDate(db, date),
  ]);

  const cashExpectedFils =
    openingRegisterFils + closing.cashSalesFils - cashOutTodayFils;

  return {
    closingId,
    reportDate: date,
    openingRegisterFils,
    cashSalesFils: closing.cashSalesFils,
    cashOutTodayFils,
    cashExpectedFils,
    cashCountedFils: closing.cashCountedFils,
    cashVarianceFils: closing.cashCountedFils - cashExpectedFils,
    deliveryLines,
    waste,
    complimentary,
    cashOuts,
    cashPurchases,
  };
}

/**
 * Money effects of approving a closing. Idempotent via source tags. Cash sales
 * become a register cash-in; card / BenefitPay / each delivery platform get a
 * pending settlement for what the shop should receive (delivery net of the
 * owner-set commission + per-order fee).
 */
async function postApprovalEffects(
  db: SupabaseClient,
  closing: DailyClosing,
  reviewedBy: string,
): Promise<void> {
  const date = closing.reportDate;

  if (closing.cashSalesFils > 0) {
    await insertCashMovement(db, {
      direction: "in",
      reason: `Cash sales — ${date}`,
      amountFils: closing.cashSalesFils,
      method: "Cash",
      occurredOn: date,
      affectsPl: false,
      account: "register",
      sourceType: "daily_closing",
      sourceId: closing.id,
      createdBy: reviewedBy,
    });
  }

  const makeSettlement = (
    channel: "card" | "benefitpay" | "delivery",
    expectedFils: number,
    extra: { platform?: string; grossFils?: number; feeFils?: number } = {},
  ) =>
    insertSettlement(db, {
      channel,
      platform: extra.platform,
      periodLabel: date,
      expectedFils,
      feeFils: extra.feeFils,
      grossFils: extra.grossFils,
      salesDate: date,
      sourceClosingId: closing.id,
      autoCreated: true,
      createdBy: reviewedBy,
    });

  if (closing.cardSalesFils > 0) {
    await makeSettlement("card", closing.cardSalesFils, {
      grossFils: closing.cardSalesFils,
    });
  }
  if (closing.benefitpaySalesFils > 0) {
    await makeSettlement("benefitpay", closing.benefitpaySalesFils, {
      grossFils: closing.benefitpaySalesFils,
    });
  }

  const lines = await getDeliveryClosingLines(db, closing.id);
  if (lines.length > 0) {
    const platforms = await getPlatforms(db);
    const byId = new Map(platforms.map((p) => [p.id, p]));
    for (const line of lines) {
      if (line.salesFils <= 0) continue;
      const p = byId.get(line.platformId);
      const fee = p
        ? platformFeeFils(line.salesFils, line.orders, p.commissionBps, p.fixedFeeFils)
        : 0;
      const expected = Math.max(0, line.salesFils - fee);
      await makeSettlement("delivery", expected, {
        platform: line.platformName ?? p?.name,
        grossFils: line.salesFils,
        feeFils: fee,
      });
    }
  }
}
