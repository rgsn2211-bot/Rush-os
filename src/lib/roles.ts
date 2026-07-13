import type { UserRole } from "@/types/inventory";

/**
 * Role → home-section mapping, shared by the proxy, the login form, and the
 * server-side auth guards so all three always agree on where a role lives.
 */

export type RoleHome = "/owner" | "/worker" | "/pos-manager";

/** All role-gated URL sections. Order matters: longest prefix first, so that
 *  "/pos-manager" is never mistaken for a hypothetical "/pos" section. */
const SECTIONS: RoleHome[] = ["/pos-manager", "/worker", "/owner"];

export function homeForRole(role: UserRole | null | undefined): RoleHome {
  switch (role) {
    case "worker":
      return "/worker";
    case "pos_manager":
      return "/pos-manager";
    // Unknown/missing roles fall back to /owner, matching the previous
    // behavior; the per-page guards there still keep non-owners out.
    default:
      return "/owner";
  }
}

/**
 * When `pathname` enters a role-gated section that isn't `role`'s own,
 * returns the path to bounce them to (their home). Otherwise null.
 */
export function roleRedirectPath(
  role: UserRole | null | undefined,
  pathname: string,
): RoleHome | null {
  const home = homeForRole(role);
  const section = SECTIONS.find(
    (s) => pathname === s || pathname.startsWith(`${s}/`),
  );
  if (section && section !== home) return home;
  return null;
}
