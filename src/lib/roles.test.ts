import { describe, it, expect } from "vitest";
import { homeForRole, roleRedirectPath } from "./roles";

describe("homeForRole", () => {
  it("maps each role to its home section", () => {
    expect(homeForRole("owner")).toBe("/owner");
    expect(homeForRole("worker")).toBe("/worker");
    expect(homeForRole("pos_manager")).toBe("/pos-manager");
  });

  it("falls back to /owner for missing/unknown roles", () => {
    expect(homeForRole(null)).toBe("/owner");
    expect(homeForRole(undefined)).toBe("/owner");
  });
});

describe("roleRedirectPath", () => {
  const sections = ["/owner", "/worker", "/pos-manager"] as const;
  const roles = ["owner", "worker", "pos_manager"] as const;

  it("walls every role out of the other two sections (9-combo matrix)", () => {
    for (const role of roles) {
      const home = homeForRole(role);
      for (const section of sections) {
        const expected = section === home ? null : home;
        expect(roleRedirectPath(role, section)).toBe(expected);
        expect(roleRedirectPath(role, `${section}/anything/deep`)).toBe(
          expected,
        );
      }
    }
  });

  it("does not confuse /pos-manager with other prefixes", () => {
    // A worker inside /pos-manager must bounce even though "/pos-manager"
    // shares no boundary with "/worker".
    expect(roleRedirectPath("worker", "/pos-manager/products")).toBe(
      "/worker",
    );
    // Prefix-only overlaps are NOT sections ("/ownership" is not "/owner").
    expect(roleRedirectPath("worker", "/ownership")).toBeNull();
    expect(roleRedirectPath("owner", "/pos-managerial")).toBeNull();
  });

  it("ignores non-section paths", () => {
    expect(roleRedirectPath("worker", "/")).toBeNull();
    expect(roleRedirectPath("worker", "/login")).toBeNull();
    expect(roleRedirectPath("pos_manager", "/api/pos/catalog")).toBeNull();
  });
});
