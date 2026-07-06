import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/inventory";
import { homeForRole } from "@/lib/roles";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
}

export async function getAuthUser(
  db: SupabaseClient,
): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role as UserRole,
    displayName: profile.display_name,
  };
}

/** Page guard: redirect to /login when signed out, or to the user's own home
 *  section when their role isn't in `roles`. */
export async function requireRole(
  db: SupabaseClient,
  roles: UserRole[],
): Promise<AuthUser> {
  const authUser = await getAuthUser(db);
  if (!authUser) redirect("/login");
  if (!roles.includes(authUser.role)) redirect(homeForRole(authUser.role));
  return authUser;
}

export function requireOwner(db: SupabaseClient): Promise<AuthUser> {
  return requireRole(db, ["owner"]);
}

export function requireWorker(db: SupabaseClient): Promise<AuthUser> {
  return requireRole(db, ["worker"]);
}

export function requirePosManager(db: SupabaseClient): Promise<AuthUser> {
  return requireRole(db, ["pos_manager"]);
}

/**
 * API-route guard: like requireRole, but responds with JSON 401/403 instead of
 * redirecting. Callers must return the Response when one comes back:
 *
 *   const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
 *   if (auth instanceof Response) return auth;
 */
export async function requireRoleApi(
  db: SupabaseClient,
  roles: UserRole[],
): Promise<AuthUser | Response> {
  const authUser = await getAuthUser(db);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roles.includes(authUser.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return authUser;
}
