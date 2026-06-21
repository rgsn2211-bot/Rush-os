import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

/**
 * Supabase client for use in the BROWSER (client components).
 * Uses the public anon key. All access is constrained by Row Level Security
 * policies in the database — the anon key alone grants nothing sensitive.
 */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
