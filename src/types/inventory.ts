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
export type ReviewStatus = "approved" | "needs_review" | "voided";
export type UserRole = "owner" | "worker";

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
  defaultCostFils: number;
  costingMethod: CostingMethod;
  status: ReviewStatus;
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
  purchasedOn: string;
  isPaid: boolean;
  paidMethod: PaidMethod | null;
  dueDate: string | null;
  totalFils: number;
  imagePath: string | null;
  status: ReviewStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
  reason: string;
  notes: string | null;
  occurredAt: string;
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
  createdAt: string;
}

/** A count line enriched with item details, for the owner variance table. */
export interface InventoryCountItemWithDetails extends InventoryCountItem {
  itemName: string | null;
  stockUnit: string | null;
  basePerStock: number;
}

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
