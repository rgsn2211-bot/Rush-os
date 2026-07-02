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
