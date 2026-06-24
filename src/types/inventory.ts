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

export interface Purchase {
  id: string;
  supplierId: string | null;
  purchasedOn: string;
  isPaid: boolean;
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
