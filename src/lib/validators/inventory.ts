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

export const inventoryItemCreateSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().optional(),
  baseUnit: z.string().trim().min(1, "Base unit is required"),
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
export type InventoryItemCreateInput = z.infer<
  typeof inventoryItemCreateSchema
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
  recipe: z.array(recipeIngredientSchema).default([]),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const purchaseItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
  purchaseQty: positive, // in purchase units
  unitCostFils: fils, // per purchase unit
});

export const purchaseCreateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  purchasedOn: z.string().date().optional(),
  isPaid: z.boolean().default(false),
  dueDate: z.string().date().optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});
export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;
