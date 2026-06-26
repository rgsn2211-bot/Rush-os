import type { ReviewStatus } from "@/types/inventory";

export type CashOutKind = "purchase" | "withdrawal";

/** Cash a worker took out of the register (purchase or withdrawal). */
export interface RegisterCashOut {
  id: string;
  kind: CashOutKind;
  amountFils: number;
  reason: string;
  note: string | null;
  status: ReviewStatus;
  createdBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterCashOutWithSubmitter extends RegisterCashOut {
  submitterName: string | null;
}
