import type { ReviewStatus } from "@/types/inventory";

/** Display row for a purchase in the Money "Money Out" / payables views. */
export interface PurchaseRow {
  id: string;
  supplierName: string;
  purchasedOn: string;
  isPaid: boolean;
  paidMethod: "cash" | "bank" | null;
  dueDate: string | null;
  totalFils: number;
  /** Lifecycle stage — lets Payables flag an order that isn't received yet. */
  status: ReviewStatus;
}
