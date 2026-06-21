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

/** Format a BHD number with exactly 3 decimals (e.g. 2.3 -> "2.300"). */
export function formatBhd(bhd: number): string {
  return bhd.toLocaleString("en-BH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}
