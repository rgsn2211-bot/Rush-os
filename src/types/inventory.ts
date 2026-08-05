/**
 * Domain types for Rush OS entities.
 *
 * These are the shapes the app code works with. They mirror the database schema
 * in supabase/migrations. Once the local database is running, the fully generated
 * types live in src/types/database.ts (via `npm run db:types`); these hand-written
 * domain types stay readable and stable for services and components to use.
 */

export type ExpiryMode = "required" | "optional" | "not_needed";
export type CostingMethod = "weighted_average" | "fixed";
export type ReviewStatus = "ordered" | "approved" | "needs_review" | "voided";
export type UserRole = "owner" | "worker" | "pos_manager";

export interface Supplier {
  id: string;
  name: string;
  leadTimeDays: number;
  notes: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  baseUnit: string;
  stockUnit: string;
  basePerStock: number;
  purchaseUnit: string;
  unitsPerPurchase: number;
  expiry: ExpiryMode;
  tracksOpen: boolean;
  shelfLifeDays: number | null;
  openLifeDays: number | null;
  minBaseQty: number;
  maxBaseQty: number | null;
  safetyDays: number;
  supplierId: string | null;
  stockBaseQty: number;
  /** Total value of stock on hand, in fils. Owner-only. */
  stockValueFils: number;
  /**
   * Last known weighted-average unit cost (fils per base unit, may be
   * fractional). Used to cost consumption past zero when stock goes negative.
   */
  lastUnitCostFils: number;
  defaultCostFils: number;
  costingMethod: CostingMethod;
  status: ReviewStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An owner-managed bucket for organizing products (Menu, Modifiers, ...). */
export interface ProductGroup {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  priceFils: number;
  /** Stable POS "Id" used to map Sales-By-Item rows. */
  posItemId: number | null;
  /** Organizing group this product belongs to (null = Ungrouped). */
  groupId: string | null;
  /** Review state. 'voided' products are soft-deleted and never deduct stock. */
  status: ReviewStatus;
  /** The user who created it (null for pre-audit rows). */
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: string;
  productId: string;
  inventoryItemId: string;
  qtyBase: number;
  createdAt: string;
}

export type PaidMethod = "cash" | "bank";

export interface Purchase {
  id: string;
  supplierId: string | null;
  /** When the order was placed (also the default receive/pay date). */
  purchasedOn: string;
  isPaid: boolean;
  paidMethod: PaidMethod | null;
  /** When the payment actually posted to the cash ledger. Null until paid. */
  paidOn: string | null;
  dueDate: string | null;
  totalFils: number;
  imagePath: string | null;
  /** ordered → needs_review → approved (stock lands on approved), or voided. */
  status: ReviewStatus;
  /** When stock landed (status became approved). Null until received. */
  receivedOn: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cost-free view of a purchase — what workers see (incoming orders + receipts).
 * Never exposes money: no total, no unit costs, no paid method/date.
 */
export interface PurchaseOps {
  id: string;
  supplierId: string | null;
  purchasedOn: string;
  isPaid: boolean;
  dueDate: string | null;
  status: ReviewStatus;
  receivedOn: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Cost-free view of a purchase line — quantities only, no costs. */
export interface PurchaseItemOps {
  id: string;
  purchaseId: string;
  inventoryItemId: string;
  purchaseQty: number;
  baseQty: number;
  expiryDate: string | null;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  inventoryItemId: string;
  purchaseQty: number;
  baseQty: number;
  unitCostFils: number;
  lineTotalFils: number;
  /** Expiry date of this received lot (items with expiry tracking). */
  expiryDate: string | null;
  createdAt: string;
}

/** Cost-free view of an inventory item — what workers see. */
export interface InventoryItemOps {
  id: string;
  name: string;
  category: string | null;
  baseUnit: string;
  stockUnit: string;
  basePerStock: number;
  purchaseUnit: string;
  unitsPerPurchase: number;
  expiry: ExpiryMode;
  tracksOpen: boolean;
  shelfLifeDays: number | null;
  openLifeDays: number | null;
  minBaseQty: number;
  maxBaseQty: number | null;
  safetyDays: number;
  supplierId: string | null;
  stockBaseQty: number;
  status: ReviewStatus;
  /** The user who created it (null for pre-audit rows). */
  createdBy: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  displayName: string | null;
  createdAt: string;
}

export interface PurchaseWithSubmitter extends Purchase {
  submitterName: string | null;
}

export type PurchaseMode = "supplier_delivery" | "cash_purchase";

/** A worker-logged waste entry (spoiled / damaged / expired stock). */
export interface WasteLog {
  id: string;
  inventoryItemId: string;
  /** Amount wasted, in the item's base unit. */
  baseQty: number;
  /** Loss value in fils. Set when the owner approves (0 until then). */
  valueFils: number;
  /**
   * What was actually consumed from stock at approval, in base units. Null
   * until approved (and on rows approved before this was recorded).
   */
  consumedBaseQty: number | null;
  reason: string;
  notes: string | null;
  occurredAt: string;
  /** The business date this loss is reported on (see InventoryCount). */
  effectiveOn: string | null;
  status: ReviewStatus;
  createdBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A waste entry enriched with item + submitter details for display. */
export interface WasteLogWithDetails extends WasteLog {
  itemName: string | null;
  stockUnit: string | null;
  basePerStock: number;
  submitterName: string | null;
}

/**
 * A physical stock-count session. A worker counts the shelf and submits one
 * session (header) with many lines (one per item counted). The owner reviews
 * the variances and, on approval, reconciles each item's stock.
 */
export interface InventoryCount {
  id: string;
  notes: string | null;
  countedAt: string;
  /**
   * The business date this count's shrinkage is reported on. Independent of
   * when it was counted or approved, so a count of last month's shelves can
   * book its loss to last month. Null only on rows predating the column.
   */
  effectiveOn: string | null;
  status: ReviewStatus;
  createdBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One counted item within a session. All quantities are in base units. */
export interface InventoryCountItem {
  id: string;
  countId: string;
  inventoryItemId: string;
  /** System on-hand snapshotted when the worker submitted, in base units. */
  expectedBaseQty: number;
  /** What was physically counted, in base units. */
  countedBaseQty: number;
  /** countedBaseQty - expectedBaseQty (signed), in base units. */
  varianceBaseQty: number;
  /** Value change in fils (signed). Set on approval; 0 until then. */
  valueFils: number;
  /**
   * Set when the owner excluded this line from reports. Its usage-ledger rows
   * are deleted, so no report counts it, but the line is kept so the override
   * stays visible and can be restored.
   */
  excludedAt: string | null;
  excludedBy: string | null;
  /** Whether the line's stock adjustment was kept (true) or reverted (false). */
  excludedKeptStock: boolean | null;
  createdAt: string;
}

/** A count line enriched with item details, for the owner variance table. */
export interface InventoryCountItemWithDetails extends InventoryCountItem {
  itemName: string | null;
  stockUnit: string | null;
  basePerStock: number;
}

export type InventoryUsageSource = "pos_import" | "waste" | "count";

/**
 * One row of the inventory usage ledger — a single stock consumption event
 * with its cost, preserving which product (and product group) drove it.
 * Owner + POS Manager only; workers never read cost data.
 */
export interface InventoryUsage {
  id: string;
  /** Business date of the consumption (POS report date; today for waste/counts). */
  occurredOn: string;
  sourceType: InventoryUsageSource;
  sourceId: string;
  inventoryItemId: string;
  /** Product that drove a POS deduction; null for waste/counts/legacy rows. */
  productId: string | null;
  productGroupId: string | null;
  /** Group name snapshotted at deduction time (survives rename/delete). */
  productGroupName: string | null;
  /** Positive = consumed (COGS); negative = restored (count overage). */
  qtyBase: number;
  cogsFils: number;
  /** How the stock left: a sale, legitimate use, waste, shrinkage or overage. */
  usageClass: UsageClass;
  /** Set when this row was split off another by a partial reclassification. */
  reclassifiedFromId: string | null;
  reclassNote: string | null;
  reclassifiedBy: string | null;
  reclassifiedAt: string | null;
  createdAt: string;
}

/**
 * How consumed stock is accounted for. `sold` and `used` are legitimate
 * consumption; `wasted` and `shrinkage` are losses; `overage` is stock found
 * at a count (negative cost, not consumption at all).
 *
 * The owner can move a `wasted` or `shrinkage` row to `used` or `sold` when
 * the "loss" was really ordinary consumption the POS could not see — napkins,
 * cleaning supplies, an unmapped POS button.
 */
export type UsageClass = "sold" | "used" | "wasted" | "shrinkage" | "overage";

/** The classes that represent a real loss (what the Losses report totals). */
export const LOSS_CLASSES: UsageClass[] = ["wasted", "shrinkage"];

/** A session plus its enriched lines and submitter, for the detail view. */
export interface InventoryCountWithItems extends InventoryCount {
  items: InventoryCountItemWithDetails[];
  submitterName: string | null;
}

/** A session summary for the owner list (counts + net value, no line detail). */
export interface InventoryCountSummary extends InventoryCount {
  submitterName: string | null;
  itemCount: number;
  /** Net value change across all lines in fils (signed). 0 until approved. */
  netValueFils: number;
}
