"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItem, Product, RecipeIngredient } from "@/types/inventory";
import { formatFils, bhdToFils, filsToBhd } from "@/lib/calculations/currency";
import { effectiveUnitCostFils } from "@/lib/calculations/costing";
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
  unitCostFils: number;
}

interface ProductFormProps {
  inventoryItems: InventoryItem[];
  product?: Product;
  existingRecipe?: RecipeIngredient[];
}

export function ProductForm({
  inventoryItems,
  product,
  existingRecipe,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [priceBhd, setPriceBhd] = useState(
    product ? String(filsToBhd(product.priceFils)) : "",
  );

  const initialRecipe: RecipeLine[] = (existingRecipe ?? []).map((r) => {
    const item = inventoryItems.find((i) => i.id === r.inventoryItemId);
    return {
      inventoryItemId: r.inventoryItemId,
      name: item?.name ?? "Unknown",
      baseUnit: item?.baseUnit ?? "",
      qtyBase: r.qtyBase,
      unitCostFils: item
        ? effectiveUnitCostFils(
            { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
            item.costingMethod,
            item.defaultCostFils,
          )
        : 0,
    };
  });

  const [recipe, setRecipe] = useState<RecipeLine[]>(initialRecipe);
  const [showItemPicker, setShowItemPicker] = useState(false);

  const priceFils = bhdToFils(Number(priceBhd) || 0);
  const recipeCost = recipe.reduce(
    (sum, r) => sum + Math.round(r.qtyBase * r.unitCostFils),
    0,
  );
  const marginFils = priceFils - recipeCost;
  const marginPct = priceFils > 0 ? (marginFils / priceFils) * 100 : 0;

  function addIngredient(item: InventoryItem) {
    if (recipe.some((r) => r.inventoryItemId === item.id)) return;

    const unitCost = effectiveUnitCostFils(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      item.costingMethod,
      item.defaultCostFils,
    );

    setRecipe([
      ...recipe,
      {
        inventoryItemId: item.id,
        name: item.name,
        baseUnit: item.baseUnit,
        qtyBase: 1,
        unitCostFils: unitCost,
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
    setLoading(true);

    const body = {
      name: name.trim(),
      category: category.trim() || undefined,
      priceFils,
      recipe: recipe.map((r) => ({
        inventoryItemId: r.inventoryItemId,
        qtyBase: r.qtyBase,
      })),
    };

    const url = isEdit ? `/api/products/${product.id}` : "/api/products";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(
        data.error?.formErrors?.[0] ||
          `Failed to ${isEdit ? "update" : "create"} product`,
      );
      setLoading(false);
      return;
    }

    if (isEdit) {
      router.push(`/owner/products/${product.id}`);
    } else {
      router.push("/owner/products");
    }
    router.refresh();
  }

  const usedIds = new Set(recipe.map((r) => r.inventoryItemId));
  const availableItems = inventoryItems.filter((i) => !usedIds.has(i.id));

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Product details */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Product details
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Product name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Iced Matcha Latte (Large)"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select category</option>
                    <option value="Coffee">Coffee</option>
                    <option value="Tea">Tea</option>
                    <option value="Cold">Cold</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Other">Other</option>
                  </Select>
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
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipe editor */}
          <Card className="p-0">
            <div className="border-line-2 flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-bold">Recipe</h2>
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
                    {inventoryItems.length === 0
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

            {recipe.length > 0 && (
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
                      <th className="text-ink-3 px-5 py-2.5 text-right text-xs font-semibold uppercase">
                        Cost
                      </th>
                      <th className="w-10 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.map((r, i) => {
                      const lineCost = Math.round(r.qtyBase * r.unitCostFils);
                      return (
                        <tr
                          key={r.inventoryItemId}
                          className="border-line-2 border-b"
                        >
                          <td className="px-5 py-3 font-semibold">{r.name}</td>
                          <td className="px-5 py-3 text-right">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={r.qtyBase}
                              onChange={(e) =>
                                updateQty(i, Number(e.target.value) || 0)
                              }
                              className="border-line w-16 rounded-lg border px-2 py-1.5 text-right font-mono text-[13px] outline-none focus:border-navy"
                            />
                          </td>
                          <td className="text-ink-3 px-5 py-3">{r.baseUnit}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold">
                            {formatFils(lineCost)}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-bg border-line-2 flex items-center justify-between border-t px-5 py-4">
              <span className="text-[14.5px] font-bold">Total recipe cost</span>
              <span className="font-mono text-base font-bold">
                {formatFils(recipeCost)}{" "}
                <span className="text-ink-3 text-xs">BHD</span>
              </span>
            </div>
          </Card>
        </div>

        {/* Live margin sidebar */}
        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-3.5 text-[15px] font-bold">Live margin</h3>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-ink-2 text-[13px]">Recipe cost</span>
                <span className="text-ink-2 font-mono text-sm font-semibold">
                  {formatFils(recipeCost)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2 text-[13px]">Selling price</span>
                <span className="font-mono text-sm font-semibold">
                  {formatFils(priceFils)}
                </span>
              </div>
              <div className="border-line-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-ink-2 text-[13px]">Gross margin</span>
                  <span className="font-mono text-sm font-semibold text-rush-green">
                    {formatFils(marginFils)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-2 text-[13px]">Margin %</span>
                <span
                  className={`font-mono text-sm font-semibold ${
                    marginPct >= 70
                      ? "text-rush-green"
                      : marginPct >= 60
                        ? "text-rush-amber"
                        : "text-rush-red"
                  }`}
                >
                  {Math.round(marginPct)}%
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-rush-red-bg text-rush-red mt-4 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              full
              size="lg"
              className="mt-5"
              disabled={loading}
            >
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Product"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              full
              className="mt-2"
              onClick={() =>
                router.push(
                  isEdit
                    ? `/owner/products/${product.id}`
                    : "/owner/products",
                )
              }
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
