/**
 * BHD currency helpers.
 *
 * Bahraini Dinar (BHD) is a 3-decimal currency (1 BHD = 1000 fils).
 * To avoid floating-point rounding errors in money math, Rush OS stores and
 * calculates money as INTEGER fils internally, and only formats to BHD for display.
 *
 * Example: 2.300 BHD  ==  2300 fils
 */

export const FILS_PER_BHD = 1000;

/** Convert a BHD amount (e.g. 2.3) to integer fils (2300). */
export function bhdToFils(bhd: number): number {
  return Math.round(bhd * FILS_PER_BHD);
}

/** Convert integer fils (2300) back to a BHD number (2.3). */
export function filsToBhd(fils: number): number {
  return fils / FILS_PER_BHD;
}

/**
 * Parse a money value coming from a POS export. The complimentary report stores
 * amounts as text strings like "2.000" or "1.200", sometimes with stray spaces.
 * Returns integer fils, or null if it cannot be parsed (caller must not silently
 * treat an unparseable amount as zero).
 */
export function parseBhdToFils(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? bhdToFils(raw) : null;
  }
  const cleaned = raw.replace(/[^0-9.-]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? bhdToFils(value) : null;
}

/** Format integer fils as a BHD string with exactly 3 decimals (e.g. "2.300"). */
export function formatFils(fils: number): string {
  return filsToBhd(fils).toLocaleString("en-BH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

/**
 * Convert a BHD *unit rate* (a cost per ml/g/pc) to fractional fils.
 *
 * Unlike a money amount, the cost of a single base unit is routinely a fraction
 * of a fil — e.g. milk at 0.00054 BHD/ml = 0.54 fils/ml. So this MUST NOT round
 * to a whole fil the way `bhdToFils` does (that would turn 0.54 into 1, a ~2x
 * error). We keep sub-fil precision, rounding only to millifils to absorb
 * floating-point noise. Use this for per-unit COSTS, never for money totals.
 */
export function bhdRateToFils(bhd: number): number {
  return Math.round(bhd * FILS_PER_BHD * 1000) / 1000;
}

/**
 * Format a fractional fils *unit rate* as a BHD string. Money amounts use
 * `formatFils` (always 3 decimals); a unit rate can be much smaller, so this
 * keeps at least 3 and up to `maxDecimals` decimals (e.g. 0.54 fils -> "0.00054").
 */
export function formatFilsRate(fils: number, maxDecimals = 6): string {
  return filsToBhd(fils).toLocaleString("en-BH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: maxDecimals,
  });
}

/** Format a BHD number with exactly 3 decimals (e.g. 2.3 -> "2.300"). */
export function formatBhd(bhd: number): string {
  return bhd.toLocaleString("en-BH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}
