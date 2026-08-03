import { z } from "zod";

/**
 * Owner marks a waste or count-shrinkage record as not-really-a-loss.
 *
 * `qtyBase` is optional: omit it to adjust the whole record, or give a smaller
 * amount (in the item's BASE unit, matching how the ledger stores it) to split
 * the record and adjust only that portion — "half the napkins were used, half
 * really did go missing".
 */
export const reclassifyUsageSchema = z.object({
  usageId: z.string().uuid(),
  toClass: z.enum(["used", "sold"]),
  qtyBase: z.number().positive("Quantity must be greater than 0").optional(),
  note: z.string().trim().max(500).optional(),
});
export type ReclassifyUsageInput = z.infer<typeof reclassifyUsageSchema>;

/** Undo an adjustment, restoring the record to what its source implies. */
export const revertUsageSchema = z.object({
  usageId: z.string().uuid(),
});
