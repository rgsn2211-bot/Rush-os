import { z } from "zod";

export const CASH_OUT_KINDS = ["purchase", "withdrawal"] as const;

/** What a worker submits when taking cash out of the register. */
export const registerCashOutCreateSchema = z.object({
  kind: z.enum(CASH_OUT_KINDS),
  amountBhd: z.number().positive("Amount must be greater than 0"),
  reason: z.string().trim().min(1, "Reason required"),
  note: z.string().trim().optional(),
});
export type RegisterCashOutCreateInput = z.infer<
  typeof registerCashOutCreateSchema
>;

export const registerCashOutReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
