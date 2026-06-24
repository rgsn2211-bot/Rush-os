/** Owner-only financial domain types (Money module). All money is integer fils. */

export type PaymentMethod = "Cash" | "Card" | "Bank transfer" | "BenefitPay";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "Card",
  "Bank transfer",
  "BenefitPay",
];

export const EXPENSE_CATEGORIES = [
  "Utilities",
  "Maintenance",
  "Cleaning",
  "Marketing",
  "Transport",
  "Other",
] as const;

export interface ExpenseLine {
  id: string;
  expenseId: string;
  category: string;
  amountFils: number;
  description: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  spentOn: string;
  method: string;
  note: string | null;
  receiptPath: string | null;
  totalFils: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseWithLines extends Expense {
  lines: ExpenseLine[];
}

export type CashDirection = "in" | "out";

export interface CashMovement {
  id: string;
  direction: CashDirection;
  reason: string;
  amountFils: number;
  method: string;
  occurredOn: string;
  affectsPl: boolean;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Computed metrics for the Money overview. */
export interface MoneySummary {
  /** Net of the cash log (money in − money out). */
  cashPositionFils: number;
  /** Unpaid, non-voided supplier purchases. */
  payablesFils: number;
  /** Expenses recorded this calendar month. */
  expensesMonthFils: number;
  /** Inventory purchases recorded this calendar month. */
  inventoryPurchasesMonthFils: number;
}
