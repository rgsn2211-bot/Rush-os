import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type FakeDb } from "@/test-stubs/fake-supabase";
import { getComplimentaryProducts } from "@/services/complimentary";

const db = (f: FakeDb) => f as unknown as SupabaseClient;

const MENU = "group-menu";
const STAFF = "group-staff";

function seed(groups: Record<string, unknown>[]): FakeDb {
  return makeFakeDb({
    product_groups: groups,
    products: [
      { id: "p1", name: "Latte", price_fils: 1400, group_id: MENU, status: "approved" },
      { id: "p2", name: "Flat White", price_fils: 1400, group_id: MENU, status: "approved" },
      { id: "p3", name: "Staff Drink", price_fils: 0, group_id: STAFF, status: "approved" },
      { id: "p4", name: "Extra Shot", price_fils: 300, group_id: null, status: "approved" },
      { id: "p5", name: "Old Latte", price_fils: 1400, group_id: MENU, status: "voided" },
    ],
  });
}

describe("getComplimentaryProducts", () => {
  it("returns only Menu-group products, excluding other groups and ungrouped", async () => {
    const f = seed([
      { id: MENU, name: "Menu", sort_order: 0 },
      { id: STAFF, name: "Staff", sort_order: 4 },
    ]);

    const products = await getComplimentaryProducts(db(f));

    expect(products.map((p) => p.name).sort()).toEqual(["Flat White", "Latte"]);
  });

  it("matches the Menu group regardless of casing or padding", async () => {
    const f = seed([{ id: MENU, name: "  menu ", sort_order: 0 }]);

    const products = await getComplimentaryProducts(db(f));

    expect(products).toHaveLength(2);
  });

  it("falls back to every product when no Menu group exists", async () => {
    const f = seed([{ id: STAFF, name: "Staff", sort_order: 4 }]);

    const products = await getComplimentaryProducts(db(f));

    // All non-voided products, so the worker is never left with an empty picker.
    expect(products.map((p) => p.name).sort()).toEqual([
      "Extra Shot",
      "Flat White",
      "Latte",
      "Staff Drink",
    ]);
  });
});
