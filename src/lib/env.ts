import { z } from "zod";

/**
 * Central, validated access to environment variables.
 *
 * Why this exists: instead of reading process.env.SOMETHING in random files
 * (and crashing later with a confusing error), we validate everything once here.
 * If a required variable is missing, the app fails fast with a clear message.
 *
 * NEXT_PUBLIC_* values are safe to expose to the browser.
 * Everything else (service role key) is server-only and must never reach the client.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// These values are inlined at build time, so reference them statically.
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/**
 * Server-only secrets. Call this from server code (route handlers, server
 * components, services). Never import the result into a client component.
 */
export function serverEnv() {
  const schema = z.object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  });
  return schema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
