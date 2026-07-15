import type { LedgerChannel } from "@/types/money";

/**
 * Preset labels the owner can pick when recording commission, per channel.
 * Purely descriptive — the amount is entered manually. "Other" lets them type
 * their own note alongside if needed.
 */
export const FEE_TYPE_OPTIONS: Record<LedgerChannel, string[]> = {
  card: ["Processing fee", "Bank charge", "Other"],
  delivery: ["Commission", "Fixed fee", "Other"],
};
