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

/** Where the money physically sits. */
export type CashAccount = "register" | "bank";

export const CASH_ACCOUNTS: CashAccount[] = ["register", "bank"];

export interface CashMovement {
  id: string;
  direction: CashDirection;
  reason: string;
  amountFils: number;
  method: string;
  occurredOn: string;
  affectsPl: boolean;
  account: CashAccount;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency =
  | "Monthly"
  | "Weekly"
  | "On invoice"
  | "One-time";

export const RECURRING_TYPES = [
  "Rent",
  "Salaries",
  "Supplier",
  "Subscription",
  "Installment",
  "Other",
] as const;

export const RECURRING_FREQUENCIES: RecurringFrequency[] = [
  "Monthly",
  "Weekly",
  "On invoice",
  "One-time",
];

export interface RecurringCost {
  id: string;
  name: string;
  costType: string;
  amountFils: number;
  frequency: RecurringFrequency;
  nextDueDate: string;
  defaultMethod: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SettlementChannel = "card" | "benefitpay" | "delivery";
export type SettlementStatus = "pending" | "received";

export interface Settlement {
  id: string;
  channel: SettlementChannel;
  platform: string | null;
  periodLabel: string;
  expectedFils: number;
  feeFils: number | null;
  actualFils: number | null;
  receivedOn: string | null;
  status: SettlementStatus;
  note: string | null;
  /** Sales date this settlement came from (auto settlements). */
  salesDate: string | null;
  /** Pre-fee gross for the day (delivery auto settlements). */
  grossFils: number | null;
  /** The daily closing that created this settlement, if auto. */
  sourceClosingId: string | null;
  /** True when created automatically from an approved EOD. */
  autoCreated: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Projected cash position used by the Cash Flow tab. */
export interface CashFlowProjection {
  availableNowFils: number;
  expectedIncomingFils: number;
  upcomingOutgoingFils: number;
  projectedFils: number;
}

/** Computed metrics for the Money overview. */
export interface MoneySummary {
  /** Net of the cash log across all accounts (money in − money out). */
  cashPositionFils: number;
  /** Net cash in the register. */
  registerBalanceFils: number;
  /** Net money in the bank account. */
  bankBalanceFils: number;
  /** Total money on hand: register + bank ("what I have"). */
  totalMoneyFils: number;
  /** Unpaid, non-voided supplier purchases. */
  payablesFils: number;
  /** Expenses recorded this calendar month. */
  expensesMonthFils: number;
  /** Inventory purchases recorded this calendar month. */
  inventoryPurchasesMonthFils: number;
}
