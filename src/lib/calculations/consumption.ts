/**
 * Consumption-rate math for inventory insights: how fast an item is being
 * used, when it will run out, and how much to reorder. Pure functions —
 * quantities in base units, money in integer fils, dates as YYYY-MM-DD.
 */

import { addDays } from "@/lib/dates";

export interface ConsumptionEvent {
  /** Business date of the consumption. */
  occurredOn: string;
  /** Base units consumed (negative rows — restorations — reduce usage). */
  qtyBase: number;
  cogsFils: number;
}

export interface ItemInsight {
  /** Consumed in the trailing 7 / 30 days, in base units. */
  qty7: number;
  qty30: number;
  cogs30Fils: number;
  /** Average base units consumed per day over each window. */
  ratePerDay7: number;
  ratePerDay30: number;
  /**
   * Days until stock hits zero at the recent rate (7-day rate, falling back
   * to the 30-day rate). null when nothing is being consumed; 0 when stock
   * is already at or below zero.
   */
  daysToStockout: number | null;
  /** Predicted date stock runs out (null when daysToStockout is null). */
  stockoutDate: string | null;
  /** True when a reorder should happen now to avoid running out. */
  reorder: boolean;
  /** Whole purchase units to order (covers lead time + safety + one week). */
  suggestedPurchaseUnits: number;
}

export interface ItemInsightInput {
  /** Ledger events for this item within the trailing 30 days. */
  events: ConsumptionEvent[];
  /** Today's business date (YYYY-MM-DD). */
  today: string;
  stockBaseQty: number;
  /** Supplier lead time in days (0 when unknown). */
  leadTimeDays: number;
  /** Item safety buffer in days. */
  safetyDays: number;
  unitsPerPurchase: number;
  basePerStock: number;
}

export function computeItemInsight(input: ItemInsightInput): ItemInsight {
  const {
    events,
    today,
    stockBaseQty,
    leadTimeDays,
    safetyDays,
    unitsPerPurchase,
    basePerStock,
  } = input;

  const from7 = addDays(today, -6); // 7 calendar days including today
  const from30 = addDays(today, -29);

  let qty7 = 0;
  let qty30 = 0;
  let cogs30Fils = 0;
  for (const e of events) {
    if (e.occurredOn < from30 || e.occurredOn > today) continue;
    qty30 += e.qtyBase;
    cogs30Fils += e.cogsFils;
    if (e.occurredOn >= from7) qty7 += e.qtyBase;
  }
  qty7 = Math.max(0, qty7);
  qty30 = Math.max(0, qty30);

  const ratePerDay7 = qty7 / 7;
  const ratePerDay30 = qty30 / 30;
  // Prefer the recent week's pace; fall back to the month when the week was
  // quiet (e.g. item sells slowly or data just started).
  const effectiveRate = ratePerDay7 > 0 ? ratePerDay7 : ratePerDay30;

  let daysToStockout: number | null;
  if (stockBaseQty <= 0) {
    daysToStockout = 0;
  } else if (effectiveRate > 0) {
    daysToStockout = stockBaseQty / effectiveRate;
  } else {
    daysToStockout = null;
  }

  const stockoutDate =
    daysToStockout === null ? null : addDays(today, Math.floor(daysToStockout));

  const coverageDays = leadTimeDays + safetyDays;
  const reorder =
    daysToStockout !== null && daysToStockout <= Math.max(coverageDays, 1);

  // Order enough to cover lead time + safety + one week of the recent rate,
  // minus what's on hand (negative on-hand adds to the need), rounded UP to
  // whole purchase units.
  const basePerPurchase = unitsPerPurchase * basePerStock;
  const neededBase = Math.max(
    0,
    effectiveRate * (coverageDays + 7) - stockBaseQty,
  );
  const suggestedPurchaseUnits =
    reorder && basePerPurchase > 0 ? Math.ceil(neededBase / basePerPurchase) : 0;

  return {
    qty7,
    qty30,
    cogs30Fils,
    ratePerDay7,
    ratePerDay30,
    daysToStockout,
    stockoutDate,
    reorder,
    suggestedPurchaseUnits,
  };
}
