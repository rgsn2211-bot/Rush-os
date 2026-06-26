import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyClosing,
  DailyClosingWithSubmitter,
} from "@/types/closing";
import type { DailyClosingCreateInput } from "@/lib/validators/closing";
import { bhdToFils } from "@/lib/calculations/currency";
import {
  insertDailyClosing,
  insertDeliveryClosingLines,
  getDeliveryClosingLines,
  listDailyClosings,
  listPendingDailyClosings,
  getDailyClosingByDate,
  getDailyClosing,
  updateDailyClosingStatus,
  deleteDailyClosing,
} from "@/repositories/daily-closing";
import { insertCashMovement } from "@/repositories/cash-movements";
import { insertSettlement } from "@/repositories/settlements";
import { getPlatforms, platformFeeFils } from "@/services/delivery";

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

  const grossSalesFils =
    cashSalesFils + cardSalesFils + benefitpaySalesFils + deliverySalesFils;
  const totalOrders =
    input.cashOrders +
    input.cardOrders +
    input.benefitpayOrders +
    deliveryOrders;

  const cashCountedFils = bhdToFils(input.cashCountedBhd);
  const cashExpectedFils = cashSalesFils;
  const cashVarianceFils = cashCountedFils - cashExpectedFils;

  const closing = await insertDailyClosing(db, {
    reportDate: input.reportDate,
    totalOrders,
    discountFils: bhdToFils(input.discountBhd),
    cashSalesFils,
    cashOrders: input.cashOrders,
    cardSalesFils,
    cardOrders: input.cardOrders,
    benefitpaySalesFils,
    benefitpayOrders: input.benefitpayOrders,
    deliverySalesFils,
    grossSalesFils,
    cashCountedFils,
    cashExpectedFils,
    cashVarianceFils,
    notes: input.notes,
    createdBy,
  });

  // Only persist platforms the worker actually entered (sales or orders > 0).
  const linesToSave = deliveryLines.filter(
    (l) => l.salesFils > 0 || l.orders > 0,
  );
  await insertDeliveryClosingLines(db, closing.id, linesToSave);

  return closing;
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

  await updateDailyClosingStatus(db, id, "approved", reviewedBy);
  await postApprovalEffects(db, closing, reviewedBy);
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
