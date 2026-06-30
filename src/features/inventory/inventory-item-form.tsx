"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItem, Supplier } from "@/types/inventory";
import {
  formatFils,
  bhdRateToFils,
  filsToBhd,
} from "@/lib/calculations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface InventoryItemFormProps {
  suppliers: Supplier[];
  item?: InventoryItem;
}

export function InventoryItemForm({ suppliers, item }: InventoryItemFormProps) {
  const router = useRouter();
  const isEdit = !!item;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [baseUnit, setBaseUnit] = useState(item?.baseUnit ?? "g");
  const [stockUnit, setStockUnit] = useState(item?.stockUnit ?? "kg");
  const [basePerStock, setBasePerStock] = useState(
    String(item?.basePerStock ?? 1000),
  );
  const [purchaseUnit, setPurchaseUnit] = useState(item?.purchaseUnit ?? "");
  const [unitsPerPurchase, setUnitsPerPurchase] = useState(
    String(item?.unitsPerPurchase ?? 1),
  );
  const [expiry, setExpiry] = useState<"required" | "optional" | "not_needed">(
    item?.expiry ?? "not_needed",
  );
  const [tracksOpen, setTracksOpen] = useState(item?.tracksOpen ?? false);
  const [shelfLifeDays, setShelfLifeDays] = useState(
    item?.shelfLifeDays != null ? String(item.shelfLifeDays) : "",
  );
  const [openLifeDays, setOpenLifeDays] = useState(
    item?.openLifeDays != null ? String(item.openLifeDays) : "",
  );
  const [minBaseQty, setMinBaseQty] = useState(
    String(item?.minBaseQty ?? 0),
  );
  const [maxBaseQty, setMaxBaseQty] = useState(
    item?.maxBaseQty != null ? String(item.maxBaseQty) : "",
  );
  const [safetyDays, setSafetyDays] = useState(
    String(item?.safetyDays ?? 0),
  );
  const [supplierId, setSupplierId] = useState(item?.supplierId ?? "");
  const [defaultCostBhd, setDefaultCostBhd] = useState(
    item?.defaultCostFils ? String(filsToBhd(item.defaultCostFils)) : "",
  );
  const [costingMethod, setCostingMethod] = useState<
    "weighted_average" | "fixed"
  >(item?.costingMethod ?? "weighted_average");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const body = {
      name: name.trim(),
      category: category.trim() || undefined,
      baseUnit: baseUnit.trim(),
      stockUnit: stockUnit.trim(),
      basePerStock: Number(basePerStock) || 1,
      purchaseUnit: purchaseUnit.trim() || stockUnit.trim(),
      unitsPerPurchase: Number(unitsPerPurchase) || 1,
      expiry,
      tracksOpen,
      shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : undefined,
      openLifeDays: openLifeDays ? Number(openLifeDays) : undefined,
      minBaseQty: Number(minBaseQty) || 0,
      maxBaseQty: maxBaseQty ? Number(maxBaseQty) : undefined,
      safetyDays: Number(safetyDays) || 0,
      supplierId: supplierId || undefined,
      defaultCostFils: defaultCostBhd
        ? bhdRateToFils(Number(defaultCostBhd))
        : 0,
      costingMethod,
    };

    const url = isEdit ? `/api/inventory/${item.id}` : "/api/inventory";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] || `Failed to ${isEdit ? "update" : "create"} item`);
      setLoading(false);
      return;
    }

    if (isEdit) {
      router.push(`/owner/inventory/${item.id}`);
    } else {
      router.push("/owner/inventory");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Basics */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">Basics</h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Item name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fresh Milk"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Dairy, Coffee, Packaging"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    id="supplier"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Units & conversion */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Units & conversion
              </h2>
              <p className="text-ink-3 mb-3 text-xs">
                Stock unit is how you store it (kg, L). Base unit is for recipes
                and calculations (g, ml). Purchase unit is how you buy it (case,
                bag).
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="stockUnit">Stock unit (storage)</Label>
                  <Select
                    id="stockUnit"
                    value={stockUnit}
                    onChange={(e) => setStockUnit(e.target.value)}
                  >
                    <option value="kg">kg (kilograms)</option>
                    <option value="L">L (litres)</option>
                    <option value="pc">pc (pieces)</option>
                    <option value="btl">btl (bottles)</option>
                    <option value="bag">bag (bags)</option>
                    <option value="box">box (boxes)</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="baseUnit">Base unit (recipes)</Label>
                  <Select
                    id="baseUnit"
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                  >
                    <option value="g">g (grams)</option>
                    <option value="ml">ml (millilitres)</option>
                    <option value="pc">pc (pieces)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="L">L (litres)</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="basePerStock">
                    Conversion: 1 {stockUnit} = ? {baseUnit}
                  </Label>
                  <Input
                    id="basePerStock"
                    type="number"
                    min="0.001"
                    step="any"
                    value={basePerStock}
                    onChange={(e) => setBasePerStock(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-ink-3 mt-1 text-xs">
                    e.g. 1 kg = 1000 g, or 1 btl = 750 ml
                  </p>
                </div>
              </div>

              <div className="border-line-2 mt-4 border-t pt-4">
                <h3 className="text-ink mb-3 text-sm font-semibold">
                  Purchase unit
                </h3>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="purchaseUnit">Purchase unit</Label>
                    <Input
                      id="purchaseUnit"
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      placeholder={`e.g. case, box, ${stockUnit}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitsPerPurchase">
                      {stockUnit} per {purchaseUnit || "purchase unit"}
                    </Label>
                    <Input
                      id="unitsPerPurchase"
                      type="number"
                      min="0.001"
                      step="any"
                      value={unitsPerPurchase}
                      onChange={(e) => setUnitsPerPurchase(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-ink-3 mt-1 text-xs">
                      1 {purchaseUnit || "purchase unit"} ={" "}
                      {unitsPerPurchase || "?"} {stockUnit}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costing */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">Costing</h2>
              <p className="text-ink-3 mb-3 text-xs">
                Set a default cost per {baseUnit} for when there are no
                purchases yet, and choose whether price updates automatically
                from purchases.
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="defaultCostBhd">
                    Default cost per {baseUnit} (BHD)
                  </Label>
                  <Input
                    id="defaultCostBhd"
                    type="number"
                    min="0"
                    step="any"
                    value={defaultCostBhd}
                    onChange={(e) => setDefaultCostBhd(e.target.value)}
                    placeholder="0.000"
                    className="font-mono"
                  />
                  {Number(defaultCostBhd) > 0 &&
                    Number(basePerStock) > 0 &&
                    baseUnit !== stockUnit && (
                      <p className="text-ink-3 mt-1 text-xs">
                        ≈{" "}
                        {formatFils(
                          Math.round(
                            Number(defaultCostBhd) *
                              1000 *
                              Number(basePerStock),
                          ),
                        )}{" "}
                        BHD per {stockUnit}
                      </p>
                    )}
                </div>
                <div>
                  <Label htmlFor="costingMethod">Costing method</Label>
                  <Select
                    id="costingMethod"
                    value={costingMethod}
                    onChange={(e) =>
                      setCostingMethod(
                        e.target.value as "weighted_average" | "fixed",
                      )
                    }
                  >
                    <option value="weighted_average">
                      Weighted average (updates from purchases)
                    </option>
                    <option value="fixed">
                      Fixed (always use default cost)
                    </option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reorder settings */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Reorder settings
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="minBaseQty">
                    Minimum stock ({baseUnit})
                  </Label>
                  <Input
                    id="minBaseQty"
                    type="number"
                    min="0"
                    step="any"
                    value={minBaseQty}
                    onChange={(e) => setMinBaseQty(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="maxBaseQty">
                    Max stock override ({baseUnit})
                  </Label>
                  <Input
                    id="maxBaseQty"
                    type="number"
                    min="0"
                    step="any"
                    value={maxBaseQty}
                    onChange={(e) => setMaxBaseQty(e.target.value)}
                    placeholder="Optional"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="safetyDays">Safety days</Label>
                  <Input
                    id="safetyDays"
                    type="number"
                    min="0"
                    value={safetyDays}
                    onChange={(e) => setSafetyDays(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expiry & opening */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Expiry & opening
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="expiry">Expiry tracking</Label>
                  <Select
                    id="expiry"
                    value={expiry}
                    onChange={(e) =>
                      setExpiry(e.target.value as typeof expiry)
                    }
                  >
                    <option value="not_needed">Not needed</option>
                    <option value="optional">Optional</option>
                    <option value="required">Required</option>
                  </Select>
                  <p className="text-ink-3 mt-1 text-xs">
                    When enabled, you enter the actual expiry date on each
                    purchase.
                  </p>
                </div>
                {expiry !== "not_needed" && (
                  <div>
                    <Label htmlFor="shelfLifeDays">
                      Default shelf life (days)
                    </Label>
                    <Input
                      id="shelfLifeDays"
                      type="number"
                      min="0"
                      value={shelfLifeDays}
                      onChange={(e) => setShelfLifeDays(e.target.value)}
                      placeholder="Optional"
                      className="font-mono"
                    />
                    <p className="text-ink-3 mt-1 text-xs">
                      Auto-fills expiry date when receiving. Leave blank for
                      items with varying expiry dates.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-line-2 mt-4 flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-sm font-semibold">
                    Track after opening
                  </div>
                  <div className="text-ink-3 text-xs">
                    For milk, syrups, sauces, fresh items
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTracksOpen(!tracksOpen)}
                  className={`h-6 w-11 rounded-full transition-colors ${tracksOpen ? "bg-navy" : "bg-line"}`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${tracksOpen ? "translate-x-[22px]" : "translate-x-0.5"}`}
                  />
                </button>
              </div>

              {tracksOpen && (
                <div className="mt-3">
                  <Label htmlFor="openLifeDays">
                    Use within X days after opening
                  </Label>
                  <Input
                    id="openLifeDays"
                    type="number"
                    min="1"
                    value={openLifeDays}
                    onChange={(e) => setOpenLifeDays(e.target.value)}
                    placeholder="e.g. 3"
                    className="font-mono"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-2 text-[15px] font-bold">
              {isEdit ? "Update item" : "Create item"}
            </h3>
            <p className="text-ink-3 mb-4 text-[13px] leading-relaxed">
              {isEdit
                ? "Changes take effect immediately."
                : "You can save with just the basics and fill in advanced settings later."}
            </p>

            {isEdit && item.stockValueFils > 0 && (
              <div className="bg-bg border-line mb-4 rounded-lg border px-3 py-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-2">Stock on hand</span>
                  <span className="font-mono font-semibold">
                    {item.stockBaseQty} {item.baseUnit}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[13px]">
                  <span className="text-ink-2">Stock value</span>
                  <span className="font-mono font-semibold">
                    {formatFils(item.stockValueFils)} BHD
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rush-red-bg text-rush-red mb-4 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" full size="lg" disabled={loading}>
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Item"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              full
              className="mt-2"
              onClick={() =>
                router.push(
                  isEdit
                    ? `/owner/inventory/${item.id}`
                    : "/owner/inventory",
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
