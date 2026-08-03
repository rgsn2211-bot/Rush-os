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
  /**
   * The business date this loss is reported on. Defaults to today in Bahrain;
   * set it to book waste discovered late into the month it belongs to.
   */
  effectiveOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
    .optional(),
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

/**
 * Owner corrects a waste entry — pending or already approved. Every field is
 * optional so a single mistake (wrong quantity, wrong reason, wrong month) can
 * be fixed without restating the rest. Editing an approved entry re-adjusts
 * stock and the recorded loss.
 */
export const wasteEditSchema = z
  .object({
    stockQty: z.number().positive("Quantity must be greater than 0").optional(),
    reason: z.enum(WASTE_REASONS).optional(),
    notes: z.string().trim().nullable().optional(),
    effectiveOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
      .optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Nothing to change",
  });
export type WasteEditInput = z.infer<typeof wasteEditSchema>;

/** approve/reject a pending entry; void reverses an approved one. */
export const wasteReviewSchema = z.object({
  action: z.enum(["approve", "reject", "void"]),
});
