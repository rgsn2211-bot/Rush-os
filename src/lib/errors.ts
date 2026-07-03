/**
 * Extract a human-readable message from a thrown value.
 *
 * The repository layer throws the raw Supabase `PostgrestError`, which is a plain
 * object with a `message` field — NOT an `Error` instance. A naive
 * `err instanceof Error ? err.message : fallback` therefore discards the real
 * database reason and shows only the fallback. This helper also reads a
 * `.message` string off any object (PostgrestError, AuthError, etc.).
 */
export function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string" &&
    (err as { message: string }).message.length > 0
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

/**
 * Pull a human-readable message out of a failed API JSON body. The body's
 * `error` is either a plain string (from a service throw) or a Zod
 * `flatten()` object (`{ formErrors, fieldErrors }`) from a validation failure.
 * Surfacing the specific field error beats falling back to a generic string.
 */
export function messageFromResponse(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object" || !("error" in data)) return fallback;
  const e = (data as { error: unknown }).error;
  if (typeof e === "string" && e.length > 0) return e;
  if (e && typeof e === "object") {
    const flat = e as {
      formErrors?: string[];
      fieldErrors?: Record<string, string[] | undefined>;
    };
    if (flat.formErrors?.length) return flat.formErrors[0];
    if (flat.fieldErrors) {
      for (const [field, msgs] of Object.entries(flat.fieldErrors)) {
        if (msgs && msgs.length) return `${field}: ${msgs[0]}`;
      }
    }
  }
  return fallback;
}
