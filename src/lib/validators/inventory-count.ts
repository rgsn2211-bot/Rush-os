import { z } from "zod";

/**
 * The business date a count's shrinkage is reported on. Independent of when
 * the shelves were counted and when the owner approved it: counting August's
 * shelves for a July close books the loss to July so both months read true.
 */
const effectiveOn = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

const countLine = z.object({
  inventoryItemId: z.string().uuid(),
  countedStockQty: z.number().nonnegative("Counted quantity cannot be negative"),
});

/**
 * What a worker submits for a physical stock count. Each line's quantity is
 * entered in the item's STOCK unit (what the worker sees on the shelf); the
 * service converts it to base units and snapshots the expected on-hand before
 * storing. Items the worker did not count are simply omitted from the array.
 */
export const inventoryCountCreateSchema = z.object({
  notes: z.string().trim().optional(),
  effectiveOn: effectiveOn.optional(),
  items: z.array(countLine).min(1, "Count at least one item"),
});
export type InventoryCountCreateInput = z.infer<
  typeof inventoryCountCreateSchema
>;

/**
 * Owner edit of a submitted count — pending or already approved. The item
 * array replaces the stored lines wholesale, so the owner can fix a mistyped
 * quantity, drop a line, or add an item the worker missed. Editing an approved
 * count re-runs the reconciliation, so stock follows the corrected numbers.
 */
export const inventoryCountEditSchema = z.object({
  notes: z.string().trim().nullable().optional(),
  effectiveOn: effectiveOn.optional(),
  items: z.array(countLine).min(1, "A count needs at least one item"),
});
export type InventoryCountEditInput = z.infer<typeof inventoryCountEditSchema>;

/**
 * Owner acts on ONE line of an approved count.
 *
 * - `exclude_keep_stock` — the shelf really holds the counted amount, but the
 *   variance is not a real loss or gain, so stop reporting it.
 * - `exclude_revert_stock` — the line was simply wrong: undo its stock change
 *   as well.
 * - `restore` — put an excluded line back.
 */
export const countLineActionSchema = z.object({
  inventoryItemId: z.string().uuid(),
  action: z.enum(["exclude_keep_stock", "exclude_revert_stock", "restore"]),
});
export type CountLineActionInput = z.infer<typeof countLineActionSchema>;

/** approve/reject a pending count; void reverses an approved one. */
export const inventoryCountReviewSchema = z.object({
  action: z.enum(["approve", "reject", "void"]),
});
