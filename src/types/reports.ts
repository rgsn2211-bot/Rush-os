/**
 * Shapes for the owner Profit / COGS / Losses reports. All money is integer
 * fils; every report covers one period [fromInclusive, toExclusive).
 */

export interface RevenueMethodLine {
  key: "cash" | "card" | "benefitpay" | "delivery";
  label: string;
  salesFils: number;
  orders: number;
}

export interface RevenuePlatformLine {
  platformId: string;
  name: string;
  salesFils: number;
  orders: number;
}

export interface RevenueReport {
  grossSalesFils: number;
  discountFils: number;
  totalOrders: number;
  methods: RevenueMethodLine[];
  deliveryPlatforms: RevenuePlatformLine[];
  cashVarianceFils: number;
  /** Approved closings found in the period vs calendar days in the period. */
  closingsCount: number;
  daysInPeriod: number;
}

export interface CogsProductLine {
  productId: string;
  name: string;
  groupName: string;
  unitsSold: number;
  salesFils: number;
  cogsFils: number;
}

export interface CogsGroupLine {
  /** Group name snapshotted at deduction time ("Ungrouped" when none). */
  name: string;
  cogsFils: number;
}

export interface CogsItemLine {
  inventoryItemId: string;
  name: string;
  baseUnit: string;
  qtyBase: number;
  cogsFils: number;
}

export interface CogsReport {
  /** Total POS-deduction COGS for the period. */
  totalFils: number;
  byProduct: CogsProductLine[];
  byGroup: CogsGroupLine[];
  byItem: CogsItemLine[];
  /** Ledger rows from before per-product tracking (item-level backfill). */
  unattributedFils: number;
  /**
   * "Of which complimentary": recipe cost of approved complimentary items in
   * the period. A subset of totalFils — never subtracted a second time.
   */
  complimentaryCostFils: number;
  /** Menu value of those complimentary items (revenue given away). */
  complimentaryValueFils: number;
  complimentaryCount: number;
  /** Imports that fed this period (deducted, non-voided). */
  importsCount: number;
}

export interface LossReport {
  wasteFils: number;
  /** Net count variance cost: positive = shrinkage loss, negative = overage. */
  countShrinkFils: number;
  totalFils: number;
}

export interface ExpenseCategoryLine {
  category: string;
  amountFils: number;
}

export interface FeeReport {
  /** Delivery commission accrued per day from the owner-configured rates. */
  deliveryCommissionFils: number;
  /** Recorded card/BenefitPay fee entries whose period ends in the range. */
  recordedFeesFils: number;
  totalFils: number;
}

export interface OtherPlReport {
  inFils: number;
  outFils: number;
  /** in − out; positive is a gain (e.g. positive balance adjustment). */
  netFils: number;
}

export interface ProfitSummary {
  grossSalesFils: number;
  cogsFils: number;
  grossProfitFils: number;
  expensesFils: number;
  feesFils: number;
  lossesFils: number;
  otherPlNetFils: number;
  netProfitFils: number;
}

export interface ProfitReport {
  fromInclusive: string;
  /** Human-facing last day of the period (inclusive). */
  toInclusive: string;
  revenue: RevenueReport;
  cogs: CogsReport;
  losses: LossReport;
  expensesTotalFils: number;
  expensesByCategory: ExpenseCategoryLine[];
  fees: FeeReport;
  otherPl: OtherPlReport;
  summary: ProfitSummary;
}
