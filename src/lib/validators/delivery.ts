import { z } from "zod";

/** Commission percent (0–100) entered by the owner; stored as basis points. */
const commissionPct = z
  .number()
  .min(0, "Cannot be negative")
  .max(100, "Cannot exceed 100%");

const feeBhd = z.number().min(0, "Cannot be negative");

export const deliveryPlatformCreateSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  commissionPct,
  fixedFeeBhd: feeBhd,
  active: z.boolean().default(true),
});
export type DeliveryPlatformCreateInput = z.infer<
  typeof deliveryPlatformCreateSchema
>;

export const deliveryPlatformUpdateSchema = deliveryPlatformCreateSchema
  .partial()
  .extend({ sortOrder: z.number().int().min(0).optional() });
export type DeliveryPlatformUpdateInput = z.infer<
  typeof deliveryPlatformUpdateSchema
>;
