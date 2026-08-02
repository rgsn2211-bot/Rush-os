import type { UsageClass } from "@/types/inventory";

/**
 * Waste above this share of an item's consumption is worth the owner's
 * attention. One place to change it.
 */
export const WASTE_ALERT_PCT = 5;

/**
 * Below this much total consumption value in the period, percentages are too
 * jumpy to act on — one wasted unit of a rarely used item is 100% waste. Such
 * items still appear in reports but are kept out of the alert list.
 */
export const LOW_VOLUME_FILS = 1000; // 1.000 BHD

export interface UsageBuckets {
  sold: number;
  used: number;
  wasted: number;
  shrinkage: number;
  overage: number;
}

export interface UsageMix extends UsageBuckets {
  /**
   * What actually left the shelf: sold + used + wasted + shrinkage. Overage is
   * excluded — stock FOUND at a count was never consumed.
   */
  totalConsumedFils: number;
  /** Share of consumption that was wasted or went missing. */
  wasteRatePct: number;
  /** Each bucket's share of consumption, as a percentage. */
  pct: UsageBuckets;
  /** Too little consumption for the percentages to mean much. */
  lowVolume: boolean;
}

export const emptyBuckets = (): UsageBuckets => ({
  sold: 0,
  used: 0,
  wasted: 0,
  shrinkage: 0,
  overage: 0,
});

/** The bucket a ledger row's value belongs in. */
export function bucketFor(usageClass: UsageClass): keyof UsageBuckets {
  return usageClass;
}

function share(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}

/**
 * Turn per-class consumption values (in fils) into the mix the reports show.
 *
 * Percentages are computed on VALUE, not quantity, so items with very
 * different unit costs compare fairly — 100 wasted napkins should not read as
 * worse than 100 wasted grams of coffee.
 *
 * A period with no consumption yields zeros, never NaN.
 */
export function usageMix(
  buckets: UsageBuckets,
  lowVolumeFils = LOW_VOLUME_FILS,
): UsageMix {
  const totalConsumedFils =
    buckets.sold + buckets.used + buckets.wasted + buckets.shrinkage;

  return {
    ...buckets,
    totalConsumedFils,
    wasteRatePct: share(buckets.wasted + buckets.shrinkage, totalConsumedFils),
    pct: {
      sold: share(buckets.sold, totalConsumedFils),
      used: share(buckets.used, totalConsumedFils),
      wasted: share(buckets.wasted, totalConsumedFils),
      shrinkage: share(buckets.shrinkage, totalConsumedFils),
      overage: share(buckets.overage, totalConsumedFils),
    },
    lowVolume: totalConsumedFils < lowVolumeFils,
  };
}

/**
 * Whether an item's waste is high enough to flag. Strictly above the
 * threshold: exactly 5% is not "above 5%". Low-volume items are never flagged.
 */
export function isHighWaste(
  mix: UsageMix,
  thresholdPct = WASTE_ALERT_PCT,
): boolean {
  if (mix.lowVolume) return false;
  return mix.wasteRatePct > thresholdPct;
}
