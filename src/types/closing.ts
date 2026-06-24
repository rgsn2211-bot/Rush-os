import type { ReviewStatus } from "@/types/inventory";

/** A daily closing (EOD) — the official daily revenue + cash record. */
export interface DailyClosing {
  id: string;
  reportDate: string;
  totalOrders: number;
  discountFils: number;
  cashSalesFils: number;
  cardSalesFils: number;
  benefitpaySalesFils: number;
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
