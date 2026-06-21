import { createClient as createServiceClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env";

/**
 * SERVICE-ROLE Supabase client. Bypasses Row Level Security entirely.
 *
 * DANGER: only use this in trusted server code for operations that legitimately
 * need to ignore RLS (e.g. system jobs, admin reconciliation). Never expose it to
 * the browser and never use it as a shortcut to skip permission checks.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();
  return createServiceClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
