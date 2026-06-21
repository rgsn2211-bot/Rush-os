/**
 * Domain types for Phase 1 entities.
 *
 * These are the shapes the app code works with. They mirror the database schema
 * in supabase/migrations. Once the local database is running, the fully generated
 * types live in src/types/database.ts (via `npm run db:types`); these hand-written
 * domain types stay readable and stable for services and components to use.
 */

export type ExpiryMode = "required" | "optional" | "not_needed";
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
