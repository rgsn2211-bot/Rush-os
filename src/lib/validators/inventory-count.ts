import { z } from "zod";

/**
 * What a worker submits for a physical stock count. Each line's quantity is
 * entered in the item's STOCK unit (what the worker sees on the shelf); the
 * service converts it to base units and snapshots the expected on-hand before
 * storing. Items the worker did not count are simply omitted from the array.
 */
export const inventoryCountCreateSchema = z.object({
  notes: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        countedStockQty: z
          .number()
          .nonnegative("Counted quantity cannot be negative"),
      }),
    )
    .min(1, "Count at least one item"),
});
export type InventoryCountCreateInput = z.infer<
  typeof inventoryCountCreateSchema
>;

export const inventoryCountReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
