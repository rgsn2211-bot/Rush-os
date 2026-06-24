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

export const cashMovementCreateSchema = z.object({
  direction: z.enum(["in", "out"]),
  reason: z.string().min(1, "Reason required"),
  amountBhd: moneyBhd.refine((v) => v > 0, "Amount must be greater than 0"),
  method: z.string().min(1),
  occurredOn: dateStr,
  affectsPl: z.boolean().default(false),
  note: z.string().trim().optional(),
});
export type CashMovementCreateInput = z.infer<typeof cashMovementCreateSchema>;
