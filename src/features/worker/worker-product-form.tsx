"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  InventoryItemOps,
  Product,
  ProductGroup,
  RecipeIngredient,
} from "@/types/inventory";
import { bhdToFils, filsToBhd } from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface RecipeLine {
  inventoryItemId: string;
  name: string;
  baseUnit: string;
  qtyBase: number;
}

interface WorkerProductFormProps {
  items: InventoryItemOps[];
  groups: ProductGroup[];
  product?: Product;
  existingRecipe?: RecipeIngredient[];
}

/**
 * Worker-facing product form. No cost, no margin — those are owner-only. It's just
 * name, group, price, and a recipe of inventory items (from the cost-free view).
 */
export function WorkerProductForm({
  items,
  groups,
  product,
  existingRecipe,
}: WorkerProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [groupId, setGroupId] = useState(product?.groupId ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [priceBhd, setPriceBhd] = useState(
    product ? String(filsToBhd(product.priceFils)) : "",
  );

  const [recipe, setRecipe] = useState<RecipeLine[]>(
    (existingRecipe ?? []).map((r) => {
      const item = items.find((i) => i.id === r.inventoryItemId);
      return {
        inventoryItemId: r.inventoryItemId,
        name: item?.name ?? "Unknown",
        baseUnit: item?.baseUnit ?? "",
        qtyBase: r.qtyBase,
      };
    }),
  );
  const [showItemPicker, setShowItemPicker] = useState(false);

  function addIngredient(item: InventoryItemOps) {
    if (recipe.some((r) => r.inventoryItemId === item.id)) return;
    setRecipe([
      ...recipe,
      {
        inventoryItemId: item.id,
        name: item.name,
        baseUnit: item.baseUnit,
        qtyBase: 1,
      },
    ]);
    setShowItemPicker(false);
  }

  function updateQty(index: number, qty: number) {
    setRecipe(recipe.map((r, i) => (i === index ? { ...r, qtyBase: qty } : r)));
  }

  function removeIngredient(index: number) {
    setRecipe(recipe.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (recipe.length === 0) {
      setError("Add at least one ingredient from inventory.");
      return;
    }

    setLoading(true);
    const body = {
      name: name.trim(),
      category: category.trim() || undefined,
      groupId: groupId || null,
      priceFils: bhdToFils(Number(priceBhd) || 0),
      recipe: recipe.map((r) => ({
        inventoryItemId: r.inventoryItemId,
        qtyBase: r.qtyBase,
      })),
    };

    const url = isEdit
      ? `/api/worker/products/${product.id}`
      : "/api/worker/products";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error?.formErrors?.[0] ||
          (typeof data.error === "string" ? data.error : null) ||
          `Failed to ${isEdit ? "update" : "submit"} product`,
      );
      setLoading(false);
      return;
    }

    router.push("/worker/products");
    router.refresh();
  }

  const usedIds = new Set(recipe.map((r) => r.inventoryItemId));
  const availableItems = items.filter((i) => !usedIds.has(i.id));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Product details */}
      <Card>
        <CardContent>
          <h2 className="text-ink mb-4 text-base font-bold">Product details</h2>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Product name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 25 Bags, Extra Shot, Staff Latte"
                required
              />
            </div>
            <div>
              <Label htmlFor="group">Group</Label>
              <Select
                id="group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">Ungrouped</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="price">Selling price (BHD)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.001"
                value={priceBhd}
                onChange={(e) => setPriceBhd(e.target.value)}
                placeholder="0.000"
                className="font-mono"
              />
              <p className="text-ink-3 mt-1 text-xs">
                Leave 0 for items that aren&apos;t sold (packaging, training,
                staff drinks).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipe editor */}
      <Card className="p-0">
        <div className="border-line-2 flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Recipe</h2>
            <p className="text-ink-3 text-xs">
              What inventory this uses each time it&apos;s made.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowItemPicker(!showItemPicker)}
          >
            + Add from inventory
          </Button>
        </div>

        {showItemPicker && (
          <div className="bg-bg border-line-2 flex flex-wrap gap-2 border-b px-5 py-3">
            {availableItems.length === 0 ? (
              <p className="text-ink-3 text-sm">
                {items.length === 0
                  ? "Add inventory items first."
                  : "All items are in the recipe."}
              </p>
            ) : (
              availableItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addIngredient(item)}
                  className="border-line text-navy cursor-pointer rounded-full border bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-50"
                >
                  + {item.name}
                </button>
              ))
            )}
          </div>
        )}

        {recipe.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-line-2 border-b">
                  <th className="text-ink-3 px-5 py-2.5 text-left text-xs font-semibold uppercase">
                    Ingredient
                  </th>
                  <th className="text-ink-3 px-5 py-2.5 text-right text-xs font-semibold uppercase">
                    Qty
                  </th>
                  <th className="text-ink-3 px-5 py-2.5 text-left text-xs font-semibold uppercase">
                    Unit
                  </th>
                  <th className="w-10 px-3" />
                </tr>
              </thead>
              <tbody>
                {recipe.map((r, i) => (
                  <tr key={r.inventoryItemId} className="border-line-2 border-b">
                    <td className="px-5 py-3 font-semibold">{r.name}</td>
                    <td className="px-5 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.qtyBase}
                        onChange={(e) =>
                          updateQty(i, Number(e.target.value) || 0)
                        }
                        className="border-line focus:border-navy w-24 rounded-lg border px-2 py-1.5 text-right font-mono text-[13px] outline-none"
                      />
                    </td>
                    <td className="text-ink-3 px-5 py-3">{r.baseUnit}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => removeIngredient(i)}
                        className="text-ink-3 hover:text-rush-red text-lg"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-ink-3 px-5 py-6 text-center text-sm">
            No ingredients yet. Tap &ldquo;Add from inventory&rdquo;.
          </div>
        )}
      </Card>

      <div className="bg-bg text-ink-3 rounded-lg px-3 py-2.5 text-[13px]">
        The owner reviews this product. It&apos;s usable right away once mapped to
        a POS item.
      </div>

      {error && (
        <div className="bg-rush-red-bg text-rush-red rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading
            ? isEdit
              ? "Saving..."
              : "Submitting..."
            : isEdit
              ? "Save Changes"
              : "Create Product"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.push("/worker/products")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
