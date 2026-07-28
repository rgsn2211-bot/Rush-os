/**
 * Date helpers for Rush OS.
 *
 * The shop runs in Bahrain (UTC+3). "Today" for the business must be the local
 * Bahrain date, NOT the server's UTC date. Deriving it from
 * `new Date().toISOString()` (UTC) is wrong between 00:00–02:59 Bahrain time,
 * when UTC is still the previous calendar day — that mismatch is what rejected
 * the after-midnight Daily Closing / Sales By Item uploads.
 */

const BAHRAIN_TZ = "Asia/Bahrain";

/**
 * Today's business date in Bahrain, as a `YYYY-MM-DD` string.
 * `en-CA` formats dates as `YYYY-MM-DD`, and `timeZone` shifts the wall-clock
 * date into Bahrain local time before formatting.
 */
export function todayInBahrain(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BAHRAIN_TZ }).format(
    new Date(),
  );
}

/**
 * A reporting period as a half-open range: fromInclusive <= date < toExclusive.
 * All range queries in the app share this one convention so period edges never
 * double-count or drop a day.
 */
export interface Period {
  /** First day of the period (inclusive), YYYY-MM-DD. */
  fromInclusive: string;
  /** Day AFTER the last day of the period (exclusive), YYYY-MM-DD. */
  toExclusive: string;
  /** The human-facing last day of the period (inclusive), YYYY-MM-DD. */
  toInclusive: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Add days to a YYYY-MM-DD string (UTC math on plain calendar dates). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/** The month a YYYY-MM-DD date belongs to, as [inclusive, exclusive) bounds. */
export function monthBoundsOf(date: string): Period {
  const [y, m] = date.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  const fromInclusive = from.toISOString().split("T")[0];
  const toExclusive = to.toISOString().split("T")[0];
  return { fromInclusive, toExclusive, toInclusive: addDays(toExclusive, -1) };
}

/**
 * Resolve report search params into a Period. Both dates are the human
 * INCLUSIVE form (?from=2026-07-01&to=2026-07-31); the exclusive bound is
 * derived here. Missing or malformed input falls back to the current Bahrain
 * month, and a reversed range is swapped rather than rejected.
 */
export function resolvePeriod(from?: string, to?: string): Period {
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return monthBoundsOf(todayInBahrain());
  }
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  return { fromInclusive: lo, toExclusive: addDays(hi, 1), toInclusive: hi };
}
