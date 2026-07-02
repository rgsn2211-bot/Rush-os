import { z } from "zod";

const moneyBhd = z.number().min(0, "Cannot be negative");
const orderCount = z.number().int().min(0).default(0);

/** One delivery platform's sales + order count for the day. */
export const deliveryLineSchema = z.object({
  platformId: z.string().uuid(),
  salesBhd: moneyBhd.default(0),
  orders: orderCount,
});

/**
 * What a worker submits to close out the day. Money fields arrive in BHD and
 * are converted to integer fils in the service. Each payment method carries an
 * amount AND an order count; delivery is broken out per platform. total_orders
 * and delivery_sales are summed in the service. cash_counted is the drawer
 * total; the service computes the expected cash and the variance.
 */
/** The figure fields common to creating and editing a closing (no report_date). */
export const closingFiguresSchema = z.object({
  discountBhd: moneyBhd.default(0),
  cashSalesBhd: moneyBhd.default(0),
  cashOrders: orderCount,
  cardSalesBhd: moneyBhd.default(0),
  cardOrders: orderCount,
  benefitpaySalesBhd: moneyBhd.default(0),
  benefitpayOrders: orderCount,
  deliveryLines: z.array(deliveryLineSchema).default([]),
  cashCountedBhd: moneyBhd.default(0),
  notes: z.string().trim().optional(),
});

export const dailyClosingCreateSchema = closingFiguresSchema.extend({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});
export type DailyClosingCreateInput = z.infer<typeof dailyClosingCreateSchema>;

/**
 * What the owner submits when editing an existing closing. Same figures as a
 * create, but the report_date is immutable (changing it could collide with the
 * one-non-voided-closing-per-date unique index), so it is omitted here.
 */
export const dailyClosingUpdateSchema = closingFiguresSchema;
export type DailyClosingUpdateInput = z.infer<typeof dailyClosingUpdateSchema>;

export const dailyClosingReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
