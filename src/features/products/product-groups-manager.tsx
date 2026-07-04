"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductGroup } from "@/types/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronUp, ChevronDown, Trash2, Check } from "lucide-react";

export function ProductGroupsManager({ groups }: { groups: ProductGroup[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local rename drafts keyed by group id.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function send(url: string, method: string, body?: unknown) {
    setError(null);
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string"
          ? data.error
          : "Something went wrong. That name may already be taken.",
      );
      return false;
    }
    router.refresh();
    return true;
  }

  async function addGroup() {
    const name = newName.trim();
    if (!name) return;
    const ok = await send("/api/product-groups", "POST", {
      name,
      sortOrder: groups.length,
    });
    if (ok) setNewName("");
  }

  async function rename(id: string) {
    const name = (drafts[id] ?? "").trim();
    if (!name) return;
    const ok = await send(`/api/product-groups/${id}`, "PATCH", { name });
    if (ok) setDrafts((d) => ({ ...d, [id]: "" }));
  }

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Delete the "${name}" group? Its products stay, but become Ungrouped.`,
      )
    )
      return;
    await send(`/api/product-groups/${id}`, "DELETE");
  }

  // Swap sort_order with the adjacent group (dir -1 = up, +1 = down).
  async function move(index: number, dir: -1 | 1) {
    const other = index + dir;
    if (other < 0 || other >= groups.length) return;
    const a = groups[index];
    const b = groups[other];
    setError(null);
    setBusy(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/product-groups/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      fetch(`/api/product-groups/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]);
    setBusy(false);
    if (!r1.ok || !r2.ok) {
      setError("Could not reorder groups. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/owner/products"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to products
      </Link>
      <PageHeader
        title="Manage Groups"
        subtitle="Buckets used to organize the product list (e.g. Menu, Modifiers, Training)"
      />

      <Card className="mb-5">
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="new-group" className="text-ink-2 text-sm font-semibold">
                New group name
              </label>
              <Input
                id="new-group"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addGroup();
                }}
                placeholder="e.g. Staff drinks"
                className="mt-1"
              />
            </div>
            <Button onClick={addGroup} disabled={busy || !newName.trim()}>
              Add group
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-rush-red-bg text-rush-red mb-4 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState message="No groups yet. Add your first group above." />
      ) : (
        <Card className="p-0">
          <ul>
            {groups.map((g, i) => (
              <li
                key={g.id}
                className="border-line-2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    className="text-ink-3 hover:text-navy disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={busy || i === groups.length - 1}
                    className="text-ink-3 hover:text-navy disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <Input
                  value={drafts[g.id] ?? g.name}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [g.id]: e.target.value }))
                  }
                  className="max-w-xs"
                />
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => rename(g.id)}
                    disabled={
                      busy ||
                      drafts[g.id] === undefined ||
                      drafts[g.id].trim() === g.name ||
                      drafts[g.id].trim() === ""
                    }
                  >
                    <Check size={16} className="mr-1" />
                    Save
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(g.id, g.name)}
                    disabled={busy}
                    className="text-ink-3 hover:text-rush-red disabled:opacity-30"
                    aria-label={`Delete ${g.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
