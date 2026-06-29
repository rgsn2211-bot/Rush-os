import { z } from "zod";

export const WASTE_REASONS = [
  "spoilage",
  "breakage",
  "expired",
  "training",
  "other",
] as const;

export type WasteReason = (typeof WASTE_REASONS)[number];

/**
 * What a worker submits when logging waste. The quantity is entered in the
 * item's STOCK unit (what the worker sees on the shelf, e.g. litres, pieces);
 * the service converts it to base units before storing.
 */
export const wasteLogCreateSchema = z.object({
  inventoryItemId: z.string().uuid(),
  stockQty: z.number().positive("Quantity must be greater than 0"),
  reason: z.enum(WASTE_REASONS),
  notes: z.string().trim().optional(),
});
export type WasteLogCreateInput = z.infer<typeof wasteLogCreateSchema>;

/**
 * A worker can record several wasted items in one submission. Each line becomes
 * its own waste_log row (so the owner reviews — and approves/rejects — each item
 * individually). At least one line is required.
 */
export const wasteLogBatchCreateSchema = z.object({
  items: z
    .array(wasteLogCreateSchema)
    .min(1, "Add at least one item"),
});
export type WasteLogBatchCreateInput = z.infer<
  typeof wasteLogBatchCreateSchema
>;

export const wasteReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
