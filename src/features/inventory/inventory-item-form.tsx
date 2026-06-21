"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface InventoryItemFormProps {
  suppliers: Supplier[];
}

export function InventoryItemForm({ suppliers }: InventoryItemFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [baseUnit, setBaseUnit] = useState("L");
  const [purchaseUnit, setPurchaseUnit] = useState("");
  const [unitsPerPurchase, setUnitsPerPurchase] = useState("1");
  const [expiry, setExpiry] = useState<"required" | "optional" | "not_needed">("not_needed");
  const [tracksOpen, setTracksOpen] = useState(false);
  const [shelfLifeDays, setShelfLifeDays] = useState("");
  const [openLifeDays, setOpenLifeDays] = useState("");
  const [minBaseQty, setMinBaseQty] = useState("0");
  const [maxBaseQty, setMaxBaseQty] = useState("");
  const [safetyDays, setSafetyDays] = useState("0");
  const [supplierId, setSupplierId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const body = {
      name: name.trim(),
      category: category.trim() || undefined,
      baseUnit: baseUnit.trim(),
      purchaseUnit: purchaseUnit.trim() || baseUnit.trim(),
      unitsPerPurchase: Number(unitsPerPurchase) || 1,
      expiry,
      tracksOpen,
      shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : undefined,
      openLifeDays: openLifeDays ? Number(openLifeDays) : undefined,
      minBaseQty: Number(minBaseQty) || 0,
      maxBaseQty: maxBaseQty ? Number(maxBaseQty) : undefined,
      safetyDays: Number(safetyDays) || 0,
      supplierId: supplierId || undefined,
    };

    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] || "Failed to create item");
      setLoading(false);
      return;
    }

    router.push("/owner/inventory");
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
                  <Label htmlFor="baseUnit">Base unit</Label>
                  <Select
                    id="baseUnit"
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                  >
                    <option value="L">L (litres)</option>
                    <option value="g">g (grams)</option>
                    <option value="pc">pc (pieces)</option>
                    <option value="btl">btl (bottles)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="ml">ml (millilitres)</option>
                  </Select>
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

          {/* Purchase unit & conversion */}
          <Card>
            <CardContent>
              <h2 className="text-ink mb-4 text-base font-bold">
                Purchase unit & conversion
              </h2>
              <p className="text-ink-3 mb-3 text-xs">
                How you buy vs. how you count stock
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="purchaseUnit">Purchase unit</Label>
                  <Input
                    id="purchaseUnit"
                    value={purchaseUnit}
                    onChange={(e) => setPurchaseUnit(e.target.value)}
                    placeholder="e.g. case, box, kg"
                  />
                </div>
                <div>
                  <Label htmlFor="unitsPerPurchase">
                    Units per purchase
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
                    1 {purchaseUnit || "purchase unit"} = {unitsPerPurchase || "?"}{" "}
                    {baseUnit}
                  </p>
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
                  <Label htmlFor="minBaseQty">Minimum stock ({baseUnit})</Label>
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
                  <Label htmlFor="maxBaseQty">Max stock override ({baseUnit})</Label>
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
                    onChange={(e) => setExpiry(e.target.value as typeof expiry)}
                  >
                    <option value="not_needed">Not needed</option>
                    <option value="optional">Optional</option>
                    <option value="required">Required</option>
                  </Select>
                </div>
                {expiry !== "not_needed" && (
                  <div>
                    <Label htmlFor="shelfLifeDays">Shelf life (days)</Label>
                    <Input
                      id="shelfLifeDays"
                      type="number"
                      min="0"
                      value={shelfLifeDays}
                      onChange={(e) => setShelfLifeDays(e.target.value)}
                      placeholder="e.g. 7"
                      className="font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="border-line-2 mt-4 flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-sm font-semibold">Track after opening</div>
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
            <h3 className="mb-2 text-[15px] font-bold">Create item</h3>
            <p className="text-ink-3 mb-4 text-[13px] leading-relaxed">
              You can save with just the basics and fill in advanced settings later.
            </p>

            {error && (
              <div className="bg-rush-red-bg text-rush-red mb-4 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" full size="lg" disabled={loading}>
              {loading ? "Creating..." : "Create Item"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              full
              className="mt-2"
              onClick={() => router.push("/owner/inventory")}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
