import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/inventory";

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

export async function requireOwner(db: SupabaseClient): Promise<AuthUser> {
  const authUser = await getAuthUser(db);
  if (!authUser) redirect("/login");
  if (authUser.role !== "owner") redirect("/worker");
  return authUser;
}

export async function requireWorker(db: SupabaseClient): Promise<AuthUser> {
  const authUser = await getAuthUser(db);
  if (!authUser) redirect("/login");
  if (authUser.role !== "worker") redirect("/owner");
  return authUser;
}
