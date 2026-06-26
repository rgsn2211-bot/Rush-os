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
export const dailyClosingCreateSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
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
export type DailyClosingCreateInput = z.infer<typeof dailyClosingCreateSchema>;

export const dailyClosingReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
