import { z } from "zod";

export const posMapItemSchema = z.object({
  posItemId: z.number().int().positive(),
  productId: z.string().uuid(),
});
export type PosMapItemInput = z.infer<typeof posMapItemSchema>;

export const posUnmapItemSchema = z.object({
  posItemId: z.number().int().positive(),
});

export const posIgnoreItemSchema = z.object({
  posItemId: z.number().int().positive(),
  ignore: z.boolean(),
});

export const COMPLIMENTARY_REASONS = [
  "customer_remake",
  "staff",
  "influencer",
  "quality_check",
  "customer_goodwill",
  "loyalty",
  "other",
] as const;

export type ComplimentaryReason = (typeof COMPLIMENTARY_REASONS)[number];

export const complimentaryLogCreateSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  amountBhd: z
    .number()
    .positive("Amount must be greater than 0"),
  reason: z.enum(COMPLIMENTARY_REASONS),
  notes: z.string().trim().optional(),
});
export type ComplimentaryLogCreateInput = z.infer<
  typeof complimentaryLogCreateSchema
>;

export const complimentaryReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});
