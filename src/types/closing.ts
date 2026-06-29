import type {
  ReviewStatus,
  Purchase,
  WasteLogWithDetails,
} from "@/types/inventory";
import type { ComplimentaryLogWithSubmitter } from "@/types/pos";
import type { RegisterCashOut } from "@/types/register-cash-out";

/** Per-platform delivery sales/orders captured in a closing. */
export interface DeliveryClosingLine {
  platformId: string;
  platformName?: string;
  salesFils: number;
  orders: number;
}

/** A daily closing (EOD) — the official daily revenue + cash record. */
export interface DailyClosing {
  id: string;
  reportDate: string;
  totalOrders: number;
  discountFils: number;
  cashSalesFils: number;
  cashOrders: number;
  cardSalesFils: number;
  cardOrders: number;
  benefitpaySalesFils: number;
  benefitpayOrders: number;
  deliverySalesFils: number;
  /** cash + card + benefitpay + delivery. */
  grossSalesFils: number;
  cashCountedFils: number;
  cashExpectedFils: number;
  /** counted - expected; may be negative. */
  cashVarianceFils: number;
  notes: string | null;
  status: ReviewStatus;
  createdBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyClosingWithSubmitter extends DailyClosing {
  submitterName: string | null;
}

/**
 * Everything the owner needs to review a day's closing in one place: the drawer
 * reconciliation (opening register cash + cash sales − cash that left the
 * register that day = expected, vs counted), plus the day's waste, complimentary
 * items, register cash-outs and cash purchases.
 */
export interface ClosingReviewDetails {
  closingId: string;
  reportDate: string;
  /** Register cash carried over from before this day. */
  openingRegisterFils: number;
  cashSalesFils: number;
  /** Cash that left the register this day (cash purchases + withdrawals). */
  cashOutTodayFils: number;
  /** openingRegister + cashSales − cashOutToday. */
  cashExpectedFils: number;
  cashCountedFils: number;
  /** counted − expected; may be negative. */
  cashVarianceFils: number;
  deliveryLines: DeliveryClosingLine[];
  waste: WasteLogWithDetails[];
  complimentary: ComplimentaryLogWithSubmitter[];
  cashOuts: RegisterCashOut[];
  cashPurchases: Purchase[];
}
