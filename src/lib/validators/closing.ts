import { z } from "zod";

const moneyBhd = z.number().min(0, "Cannot be negative");

/**
 * What a worker submits to close out the day. Money fields arrive in BHD and
 * are converted to integer fils in the service. cash_counted is the total from
 * the drawer count; the service computes the expected cash and the variance.
 */
export const dailyClosingCreateSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  totalOrders: z.number().int().min(0).default(0),
  discountBhd: moneyBhd.default(0),
  cashSalesBhd: moneyBhd.default(0),
  cardSalesBhd: moneyBhd.default(0),
  benefitpaySalesBhd: moneyBhd.default(0),
  deliverySalesBhd: moneyBhd.default(0),
  cashCountedBhd: moneyBhd.default(0),
  notes: z.string().trim().optional(),
});
export type DailyClosingCreateInput = z.infer<typeof dailyClosingCreateSchema>;

export const dailyClosingReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
