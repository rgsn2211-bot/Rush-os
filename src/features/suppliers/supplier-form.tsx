"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SupplierFormProps {
  supplier?: Supplier;
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter();
  const isEdit = !!supplier;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(supplier?.name ?? "");
  const [leadTimeDays, setLeadTimeDays] = useState(
    String(supplier?.leadTimeDays ?? 0),
  );
  const [notes, setNotes] = useState(supplier?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const body = {
      name: name.trim(),
      leadTimeDays: Number(leadTimeDays) || 0,
      notes: notes.trim() || undefined,
    };

    const url = isEdit ? `/api/suppliers/${supplier.id}` : "/api/suppliers";
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
          `Failed to ${isEdit ? "update" : "create"} supplier`,
      );
      setLoading(false);
      return;
    }

    if (isEdit) {
      router.push(`/owner/suppliers/${supplier.id}`);
    } else {
      router.push("/owner/suppliers");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardContent>
            <h2 className="text-ink mb-4 text-base font-bold">
              Supplier details
            </h2>
            <div className="grid gap-3.5">
              <div>
                <Label htmlFor="name">Supplier name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bahrain Coffee Co."
                  required
                />
              </div>
              <div>
                <Label htmlFor="leadTimeDays">Lead time (days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="0"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="font-mono"
                />
                <p className="text-ink-3 mt-1 text-xs">
                  Typical days between ordering and delivery.
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contact, payment terms, anything useful"
                  rows={3}
                  className="border-line focus:border-navy w-full rounded-lg border px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <h3 className="mb-2 text-[15px] font-bold">
              {isEdit ? "Update supplier" : "Create supplier"}
            </h3>
            <p className="text-ink-3 mb-4 text-[13px] leading-relaxed">
              Suppliers can be assigned to inventory items and purchases.
            </p>

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
                  : "Create Supplier"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              full
              className="mt-2"
              onClick={() =>
                router.push(
                  isEdit
                    ? `/owner/suppliers/${supplier.id}`
                    : "/owner/suppliers",
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
