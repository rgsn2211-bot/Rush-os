"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PosItemCatalogWithProduct, PosImport } from "@/types/pos";
import type { Product } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Upload,
  Link as LinkIcon,
  Unlink,
  EyeOff,
  Eye,
  AlertTriangle,
  Check,
  Search,
} from "lucide-react";
import { PosUploadCalendar } from "@/features/pos/pos-upload-calendar";

interface PosManagerProps {
  catalog: PosItemCatalogWithProduct[];
  products: Product[];
  imports: PosImport[];
}

type Tab = "mapping" | "imports" | "diagnostics";

export function PosManager({ catalog, products, imports }: PosManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("mapping");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mappingItem, setMappingItem] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const mapped = catalog.filter((c) => c.productId && !c.ignore);
  const unmapped = catalog.filter((c) => !c.productId && !c.ignore);
  const noRecipe = mapped.filter((c) => !c.hasRecipe);

  const filteredCatalog = catalog.filter(
    (c) =>
      c.posItemName.toLowerCase().includes(search.toLowerCase()) ||
      c.posCategory?.toLowerCase().includes(search.toLowerCase()) ||
      String(c.posItemId).includes(search),
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/pos/imports", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setUploadError(
        typeof data.error === "string" ? data.error : "Upload failed",
      );
    } else {
      router.refresh();
    }

    setUploading(false);
    e.target.value = "";
  }

  async function handleMap(posItemId: number, productId: string) {
    setActionLoading(posItemId);
    await fetch("/api/pos/catalog/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posItemId, productId }),
    });
    setMappingItem(null);
    setActionLoading(null);
    router.refresh();
  }

  async function handleUnmap(posItemId: number) {
    setActionLoading(posItemId);
    await fetch("/api/pos/catalog/unmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posItemId }),
    });
    setActionLoading(null);
    router.refresh();
  }

  async function handleIgnore(posItemId: number, ignore: boolean) {
    setActionLoading(posItemId);
    await fetch("/api/pos/catalog/ignore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posItemId, ignore }),
    });
    setActionLoading(null);
    router.refresh();
  }

  function statusBadge(item: PosItemCatalogWithProduct) {
    if (item.ignore) return <Badge variant="default">Ignored</Badge>;
    if (!item.productId) return <Badge variant="amber">Unmapped</Badge>;
    if (!item.hasRecipe) return <Badge variant="red">No recipe</Badge>;
    return <Badge variant="green">Mapped</Badge>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "mapping", label: "POS Items" },
    { id: "imports", label: "Imports" },
    { id: "diagnostics", label: "Diagnostics" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-white text-navy shadow-sm"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mapping tab */}
      {tab === "mapping" && (
        <div>
          <div className="relative mb-4">
            <Search
              size={18}
              className="text-ink-3 absolute left-3 top-1/2 -translate-y-1/2"
            />
            <Input
              placeholder="Search POS items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredCatalog.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-ink-3 py-8 text-center text-sm">
                  {catalog.length === 0
                    ? "No POS items yet. Upload a Sales By Item XLSX to populate the catalog."
                    : "No items match your search."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredCatalog.map((item) => (
                <Card key={item.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-ink-3 font-mono text-xs">
                            #{item.posItemId}
                          </span>
                          {statusBadge(item)}
                        </div>
                        <div className="mt-1 text-[15px] font-semibold">
                          {item.posItemName}
                        </div>
                        {item.posCategory && (
                          <div className="text-ink-3 text-xs">
                            {item.posCategory}
                          </div>
                        )}
                        {item.productName && (
                          <div className="text-navy mt-1 text-sm">
                            → {item.productName}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {item.productId ? (
                          <button
                            onClick={() => handleUnmap(item.posItemId)}
                            disabled={actionLoading === item.posItemId}
                            className="text-ink-3 hover:text-rush-red rounded-lg p-2 transition-colors"
                            title="Unmap"
                          >
                            <Unlink size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setMappingItem(
                                mappingItem === item.posItemId
                                  ? null
                                  : item.posItemId,
                              )
                            }
                            disabled={
                              actionLoading === item.posItemId || item.ignore
                            }
                            className="text-navy rounded-lg p-2 transition-colors hover:bg-gray-100"
                            title="Map to product"
                          >
                            <LinkIcon size={16} />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleIgnore(item.posItemId, !item.ignore)
                          }
                          disabled={actionLoading === item.posItemId}
                          className="text-ink-3 rounded-lg p-2 transition-colors hover:bg-gray-100"
                          title={item.ignore ? "Unignore" : "Ignore"}
                        >
                          {item.ignore ? (
                            <Eye size={16} />
                          ) : (
                            <EyeOff size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Inline product picker */}
                    {mappingItem === item.posItemId && (
                      <div className="border-line mt-3 border-t pt-3">
                        <div className="mb-2 text-sm font-semibold">
                          Select product
                        </div>
                        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                          {products.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleMap(item.posItemId, p.id)}
                              className="hover:bg-bg flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors"
                            >
                              <span className="font-medium">{p.name}</span>
                              {p.posItemId && (
                                <span className="text-ink-3 text-xs">
                                  POS #{p.posItemId}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Imports tab */}
      {tab === "imports" && (
        <div>
          <PosUploadCalendar imports={imports} />

          <Card className="mb-4">
            <CardContent>
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-6 py-8 transition-colors hover:border-gray-300">
                <Upload
                  size={32}
                  className="text-ink-3"
                  strokeWidth={1.5}
                />
                <div className="text-center">
                  <div className="text-sm font-semibold">
                    {uploading
                      ? "Uploading..."
                      : "Upload Sales By Item XLSX"}
                  </div>
                  <div className="text-ink-3 mt-1 text-xs">
                    Daily export from POS system
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {uploadError && (
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <AlertTriangle size={18} className="text-rush-red mt-0.5 shrink-0" />
                  <div>
                    <div className="text-rush-red text-sm font-semibold">Upload failed</div>
                    <p className="text-ink-2 mt-0.5 text-sm">{uploadError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {imports.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-ink-3 py-8 text-center text-sm">
                  No imports yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {imports.map((imp) => (
                <Card key={imp.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          {imp.reportDate}
                        </div>
                        <div className="text-ink-3 text-xs">
                          {imp.branch} · {imp.rowCount ?? 0} items ·{" "}
                          {imp.fileName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            imp.status === "processed"
                              ? "green"
                              : imp.status === "pending"
                                ? "amber"
                                : imp.status === "failed"
                                  ? "red"
                                  : "default"
                          }
                        >
                          {imp.status}
                        </Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            router.push(`/owner/pos/${imp.id}`)
                          }
                        >
                          View
                        </Button>
                      </div>
                    </div>
                    {imp.status === "pending" && (
                      <div className="text-ink-3 mt-1.5 text-xs">
                        Has unmapped items — resolve in POS Items tab
                      </div>
                    )}
                    {imp.inventoryDeducted && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600">
                        <Check size={14} /> Inventory deducted
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diagnostics tab */}
      {tab === "diagnostics" && (
        <div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total POS items" value={String(catalog.length)} />
            <MetricCard label="Mapped" value={String(mapped.length)} />
            <MetricCard
              label="Unmapped"
              value={String(unmapped.length)}
              accent={
                unmapped.length > 0 ? "var(--color-amber-500)" : undefined
              }
            />
            <MetricCard
              label="No recipe"
              value={String(noRecipe.length)}
              accent={
                noRecipe.length > 0 ? "var(--color-rush-red)" : undefined
              }
            />
          </div>

          {unmapped.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center gap-2 text-base font-bold">
                  <AlertTriangle size={18} className="text-amber-500" />
                  Unmapped POS Items ({unmapped.length})
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {unmapped.map((item) => (
                    <div
                      key={item.id}
                      className="border-line flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <span className="text-ink-3 mr-2 font-mono text-xs">
                          #{item.posItemId}
                        </span>
                        <span className="text-sm font-medium">
                          {item.posItemName}
                        </span>
                        {item.posCategory && (
                          <span className="text-ink-3 ml-2 text-xs">
                            {item.posCategory}
                          </span>
                        )}
                      </div>
                      <Badge variant="amber">Unmapped</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {noRecipe.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center gap-2 text-base font-bold">
                  <AlertTriangle size={18} className="text-rush-red" />
                  Mapped but No Recipe ({noRecipe.length})
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {noRecipe.map((item) => (
                    <div
                      key={item.id}
                      className="border-line flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <span className="text-ink-3 mr-2 font-mono text-xs">
                          #{item.posItemId}
                        </span>
                        <span className="text-sm font-medium">
                          {item.posItemName}
                        </span>
                        <span className="text-navy ml-2 text-xs">
                          → {item.productName}
                        </span>
                      </div>
                      <Badge variant="red">No recipe</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {unmapped.length === 0 && noRecipe.length === 0 && (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Check
                    size={32}
                    className="text-green-500"
                    strokeWidth={2}
                  />
                  <p className="text-ink-2 text-sm">
                    All POS items are mapped and have recipes. Ready to process
                    imports.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
