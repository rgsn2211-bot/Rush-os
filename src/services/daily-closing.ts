import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyClosing,
  DailyClosingWithSubmitter,
} from "@/types/closing";
import type { DailyClosingCreateInput } from "@/lib/validators/closing";
import { bhdToFils } from "@/lib/calculations/currency";
import {
  insertDailyClosing,
  listDailyClosings,
  listPendingDailyClosings,
  getDailyClosingByDate,
  getDailyClosing,
  updateDailyClosingStatus,
  deleteDailyClosing,
} from "@/repositories/daily-closing";

/**
 * Worker submits the end-of-day closing. Money arrives in BHD and is converted
 * to fils here. Gross sales is the sum of the payment channels; expected cash is
 * the cash-sales figure (cash-out integration comes later), and the variance is
 * counted minus expected. Created as needs_review; one closing per day.
 */
export async function submitDailyClosing(
  db: SupabaseClient,
  input: DailyClosingCreateInput,
  createdBy: string,
): Promise<DailyClosing> {
  const existing = await getDailyClosingByDate(db, input.reportDate);
  if (existing) {
    throw new Error("A closing for this date already exists");
  }

  const cashSalesFils = bhdToFils(input.cashSalesBhd);
  const cardSalesFils = bhdToFils(input.cardSalesBhd);
  const benefitpaySalesFils = bhdToFils(input.benefitpaySalesBhd);
  const deliverySalesFils = bhdToFils(input.deliverySalesBhd);
  const grossSalesFils =
    cashSalesFils + cardSalesFils + benefitpaySalesFils + deliverySalesFils;

  const cashCountedFils = bhdToFils(input.cashCountedBhd);
  const cashExpectedFils = cashSalesFils;
  const cashVarianceFils = cashCountedFils - cashExpectedFils;

  return insertDailyClosing(db, {
    reportDate: input.reportDate,
    totalOrders: input.totalOrders,
    discountFils: bhdToFils(input.discountBhd),
    cashSalesFils,
    cardSalesFils,
    benefitpaySalesFils,
    deliverySalesFils,
    grossSalesFils,
    cashCountedFils,
    cashExpectedFils,
    cashVarianceFils,
    notes: input.notes,
    createdBy,
  });
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
 * day; rejecting voids it (the worker can then resubmit a corrected closing).
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

  const newStatus = action === "approve" ? "approved" : "voided";
  await updateDailyClosingStatus(db, id, newStatus, reviewedBy);
}
