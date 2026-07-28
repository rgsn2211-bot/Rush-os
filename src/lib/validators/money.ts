import { z } from "zod";

const moneyBhd = z.number().min(0, "Cannot be negative");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const expenseCreateSchema = z.object({
  spentOn: dateStr,
  method: z.string().min(1),
  note: z.string().trim().optional(),
  lines: z
    .array(
      z.object({
        category: z.string().min(1, "Category required"),
        amountBhd: z.number().positive("Amount must be greater than 0"),
        description: z.string().trim().optional(),
      }),
    )
    .min(1, "Add at least one expense line"),
});
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

export const recurringCostCreateSchema = z.object({
  name: z.string().min(1, "Name required"),
  costType: z.string().min(1),
  amountBhd: moneyBhd.refine((v) => v > 0, "Amount required"),
  frequency: z.enum(["Monthly", "Weekly", "On invoice", "One-time"]),
  nextDueDate: dateStr,
  defaultMethod: z.string().min(1),
});
export type RecurringCostCreateInput = z.infer<
  typeof recurringCostCreateSchema
>;

/**
 * Mark a recurring cost paid, optionally covering several upcoming periods at
 * once (rent paid a quarter ahead, etc.). N periods deduct N × amount now and
 * advance the next due date by N steps. Only Weekly/Monthly can exceed 1.
 */
export const recurringPaySchema = z.object({
  periods: z.number().int().min(1).max(60).default(1),
});
export type RecurringPayInput = z.infer<typeof recurringPaySchema>;

/** Owner-only payment of a purchase (payable, prepay, or one-shot). */
export const purchasePaySchema = z.object({
  paidMethod: z.enum(["cash", "bank"]),
  paidOn: dateStr.optional(),
});
export type PurchasePayInput = z.infer<typeof purchasePaySchema>;

export const settlementCreateSchema = z.object({
  channel: z.enum(["card", "benefitpay", "delivery"]),
  platform: z.string().trim().optional(),
  periodLabel: z.string().min(1, "Period required"),
  expectedBhd: moneyBhd.refine((v) => v > 0, "Expected amount required"),
  feeBhd: moneyBhd.optional(),
  note: z.string().trim().optional(),
});
export type SettlementCreateInput = z.infer<typeof settlementCreateSchema>;

export const settlementConfirmSchema = z.object({
  actualBhd: moneyBhd,
  feeBhd: moneyBhd.optional(),
  receivedOn: dateStr,
});
export type SettlementConfirmInput = z.infer<typeof settlementConfirmSchema>;

export const settlementReconcileSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Select at least one settlement"),
  receivedTotalBhd: moneyBhd,
  receivedOn: dateStr,
});
export type SettlementReconcileInput = z.infer<
  typeof settlementReconcileSchema
>;

/** Record a settlement payout received — amount + date received only. */
export const settlementPayoutSchema = z.object({
  channel: z.enum(["card", "delivery", "benefitpay"]),
  platform: z.string().trim().min(1).optional(),
  amountBhd: moneyBhd.refine((v) => v > 0, "Amount must be greater than 0"),
  receivedOn: dateStr,
  note: z.string().trim().optional(),
});
export type SettlementPayoutInput = z.infer<typeof settlementPayoutSchema>;

/** Record commission kept by the provider over a date range. */
export const settlementCommissionSchema = z
  .object({
    channel: z.enum(["card", "delivery", "benefitpay"]),
    platform: z.string().trim().min(1).optional(),
    amountBhd: moneyBhd.refine((v) => v > 0, "Amount must be greater than 0"),
    periodFrom: dateStr,
    periodTo: dateStr,
    feeType: z.string().trim().optional(),
    note: z.string().trim().optional(),
  })
  .refine((v) => v.periodTo >= v.periodFrom, {
    message: "End date must be on or after the start date",
    path: ["periodTo"],
  });
export type SettlementCommissionInput = z.infer<
  typeof settlementCommissionSchema
>;

export const cashMovementCreateSchema = z.object({
  direction: z.enum(["in", "out"]),
  reason: z.string().min(1, "Reason required"),
  amountBhd: moneyBhd.refine((v) => v > 0, "Amount must be greater than 0"),
  method: z.string().min(1),
  occurredOn: dateStr,
  affectsPl: z.boolean().default(false),
  account: z.enum(["register", "bank"]).default("register"),
  note: z.string().trim().optional(),
});
export type CashMovementCreateInput = z.infer<typeof cashMovementCreateSchema>;

export const cashTransferSchema = z.object({
  amountBhd: moneyBhd.refine((v) => v > 0, "Amount must be greater than 0"),
  occurredOn: dateStr,
  note: z.string().trim().optional(),
});
export type CashTransferInput = z.infer<typeof cashTransferSchema>;
