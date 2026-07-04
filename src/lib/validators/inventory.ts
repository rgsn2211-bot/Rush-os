import { z } from "zod";

/**
 * Zod validators for Phase 1 inputs. These run at the API boundary (and can be
 * reused by forms) so no invalid data reaches the services or the database.
 * Money fields are integer fils; quantities are positive numbers.
 */

const fils = z.number().int().nonnegative();
const positive = z.number().positive();

export const expiryModeSchema = z.enum(["required", "optional", "not_needed"]);

export const supplierCreateSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  leadTimeDays: z.number().int().nonnegative().default(0),
  notes: z.string().trim().optional(),
});
export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;

export const costingMethodSchema = z.enum(["weighted_average", "fixed"]);

export const inventoryItemCreateSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().optional(),
  baseUnit: z.string().trim().min(1, "Base unit is required"),
  stockUnit: z.string().trim().min(1, "Stock unit is required"),
  basePerStock: positive.default(1),
  purchaseUnit: z.string().trim().min(1, "Purchase unit is required"),
  unitsPerPurchase: positive,
  expiry: expiryModeSchema.default("not_needed"),
  tracksOpen: z.boolean().default(false),
  shelfLifeDays: z.number().int().nonnegative().optional(),
  openLifeDays: z.number().int().nonnegative().optional(),
  minBaseQty: z.number().nonnegative().default(0),
  maxBaseQty: z.number().nonnegative().optional(),
  safetyDays: z.number().int().nonnegative().default(0),
  supplierId: z.string().uuid().optional(),
  // A per-base-unit cost RATE, not a money amount: for cheap items one base
  // unit (ml, g) can cost a fraction of a fil, so fractional values are valid.
  defaultCostFils: z.number().nonnegative().default(0),
  costingMethod: costingMethodSchema.default("weighted_average"),
});
export type InventoryItemCreateInput = z.infer<
  typeof inventoryItemCreateSchema
>;

/**
 * Worker-facing item schema: identical to the owner schema but WITHOUT the cost
 * fields (defaultCostFils / costingMethod). Workers never set cost — the columns
 * keep their DB defaults until the owner fills in the real cost on approval.
 */
export const workerInventoryItemCreateSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().optional(),
  baseUnit: z.string().trim().min(1, "Base unit is required"),
  stockUnit: z.string().trim().min(1, "Stock unit is required"),
  basePerStock: positive.default(1),
  purchaseUnit: z.string().trim().min(1, "Purchase unit is required"),
  unitsPerPurchase: positive,
  expiry: expiryModeSchema.default("not_needed"),
  tracksOpen: z.boolean().default(false),
  shelfLifeDays: z.number().int().nonnegative().optional(),
  openLifeDays: z.number().int().nonnegative().optional(),
  minBaseQty: z.number().nonnegative().default(0),
  maxBaseQty: z.number().nonnegative().optional(),
  safetyDays: z.number().int().nonnegative().default(0),
  supplierId: z.string().uuid().optional(),
});
export type WorkerInventoryItemCreateInput = z.infer<
  typeof workerInventoryItemCreateSchema
>;

export const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().uuid(),
  qtyBase: positive,
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  category: z.string().trim().optional(),
  priceFils: fils,
  posItemId: z.number().int().positive().optional(),
  groupId: z.string().uuid().nullable().optional(),
  recipe: z.array(recipeIngredientSchema).default([]),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productGroupCreateSchema = z.object({
  name: z.string().trim().min(1, "Group name is required"),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type ProductGroupCreateInput = z.infer<typeof productGroupCreateSchema>;

/**
 * Worker-facing product schema: name, group, price and a recipe. No cost/margin
 * is ever computed or shown for workers. Price defaults to 0 so packaging/training/
 * staff products (which aren't sold) can be logged without a selling price.
 */
export const workerProductCreateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  category: z.string().trim().optional(),
  groupId: z.string().uuid().nullable().optional(),
  priceFils: fils.default(0),
  recipe: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient"),
});
export type WorkerProductCreateInput = z.infer<typeof workerProductCreateSchema>;

/**
 * Owner review of a worker-authored item. Approving an item requires the cost the
 * worker never set (a per-base-unit rate, can be sub-fil); rejecting needs nothing.
 */
export const inventoryItemReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    defaultCostFils: z.number().nonnegative().default(0),
    costingMethod: costingMethodSchema.default("weighted_average"),
  }),
  z.object({ action: z.literal("reject") }),
]);
export type InventoryItemReviewInput = z.infer<typeof inventoryItemReviewSchema>;

/** Owner review of a worker-authored product (no cost — approving just confirms it). */
export const productReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
export type ProductReviewInput = z.infer<typeof productReviewSchema>;

export const purchaseItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
  purchaseQty: positive, // in purchase units
  unitCostFils: fils, // per purchase unit
  expiryDate: z.string().date().optional(),
});

export const purchaseCreateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  purchasedOn: z.string().date().optional(),
  isPaid: z.boolean().default(false),
  paidMethod: z.enum(["cash", "bank"]).optional(),
  dueDate: z.string().date().optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});
export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;

export const workerPurchaseItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
  purchaseQty: positive,
  unitCostFils: fils.default(0),
  expiryDate: z.string().date().optional(),
});

export const workerPurchaseCreateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  purchasedOn: z.string().date().optional(),
  isPaid: z.boolean().default(false),
  mode: z.enum(["supplier_delivery", "cash_purchase"]),
  items: z.array(workerPurchaseItemSchema).min(1, "Add at least one item"),
});
export type WorkerPurchaseCreateInput = z.infer<
  typeof workerPurchaseCreateSchema
>;

export const purchaseApproveItemSchema = z.object({
  purchaseItemId: z.string().uuid(),
  unitCostFils: fils,
});

export const purchaseApproveSchema = z.object({
  items: z
    .array(purchaseApproveItemSchema)
    .min(1, "Cost entries are required"),
});
export type PurchaseApproveInput = z.infer<typeof purchaseApproveSchema>;
