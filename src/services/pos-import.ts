import type { SupabaseClient } from "@supabase/supabase-js";
import type { PosImport, PosImportSummary, PosSalesRow } from "@/types/pos";
import { parseSalesByItemXlsx } from "@/lib/parsers/xlsx-sales";
import {
  insertPosImport,
  insertPosRawRows,
  insertPosSalesRows,
  getPosImport,
  getPosImportByHash,
  getPosImportByDateBranch,
  updatePosImportStatus,
  setInventoryDeducted,
  listPosSalesRows,
  getImportSummary,
} from "@/repositories/pos-imports";
import {
  upsertPosItemCatalog,
} from "@/repositories/pos-catalog";
import { getRecipeIngredients, getProduct } from "@/repositories/products";
import { listProductGroups } from "@/repositories/product-groups";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
import {
  insertUsageRows,
  deleteUsageBySource,
  type InsertInventoryUsageInput,
} from "@/repositories/inventory-usage";
import { consumeStockAllowNegative } from "@/lib/calculations/costing";
import { fallbackUnitCostFils } from "@/services/inventory-costing";

async function computeFileHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface UploadResult {
  import: PosImport;
  summary: PosImportSummary;
  salesRows: PosSalesRow[];
}

export async function uploadSalesImport(
  db: SupabaseClient,
  fileBuffer: ArrayBuffer,
  fileName: string,
  uploadedBy: string,
  expectedDate?: string,
): Promise<UploadResult> {
  const fileHash = await computeFileHash(fileBuffer);

  const existingHash = await getPosImportByHash(db, fileHash);
  if (existingHash) {
    throw new Error(
      `This exact file was already uploaded on ${existingHash.uploadedAt} (import ${existingHash.id}). Void the previous import first to re-upload.`,
    );
  }

  const parsed = parseSalesByItemXlsx(fileBuffer);

  if (expectedDate && parsed.header.periodEnd !== expectedDate) {
    throw new Error(
      `Selected date is ${expectedDate} but this file is for ${parsed.header.periodEnd}. Upload the correct file or clear the date selection.`,
    );
  }

  const existingDate = await getPosImportByDateBranch(
    db,
    "sales_by_item",
    parsed.header.branch,
    parsed.header.periodEnd,
  );
  if (existingDate) {
    throw new Error(
      `An import already exists for ${parsed.header.branch} on ${existingDate.reportDate} (import ${existingDate.id}). Void the previous import first.`,
    );
  }

  const posImport = await insertPosImport(db, {
    reportType: "sales_by_item",
    branch: parsed.header.branch,
    reportDate: parsed.header.periodEnd,
    fileName,
    fileHash,
    uploadedBy,
    status: "pending",
    rowCount: parsed.rows.length,
  });

  const rawRowInputs = [
    ...parsed.rows.map((r) => ({
      importId: posImport.id,
      sheet: "Worksheet",
      rowNumber: r.rowNumber,
      rawCells: r.rawCells,
    })),
    ...parsed.skippedRows.map((r) => ({
      importId: posImport.id,
      sheet: "Worksheet",
      rowNumber: r.rowNumber,
      rawCells: r.rawCells,
    })),
  ];

  const rawRows = await insertPosRawRows(db, rawRowInputs);
  const rawRowMap = new Map(rawRows.map((r) => [r.rowNumber, r.id]));

  const salesRowInputs = [];

  for (const row of parsed.rows) {
    const catalogEntry = await upsertPosItemCatalog(
      db,
      row.posItemId,
      row.itemName,
      row.category || null,
    );

    let status: string;
    let productId: string | null = null;

    if (catalogEntry.ignore) {
      status = "ignored";
    } else if (catalogEntry.productId) {
      productId = catalogEntry.productId;
      const recipe = await getRecipeIngredients(db, productId);
      status = recipe.length > 0 ? "mapped" : "needs_review";
    } else {
      status = "unmapped";
    }

    salesRowInputs.push({
      importId: posImport.id,
      rawRowId: rawRowMap.get(row.rowNumber) ?? null,
      posItemId: row.posItemId,
      posItemName: row.itemName,
      category: row.category || null,
      qtySold: row.qtySold,
      amountFils: row.amountFils,
      productId,
      status,
    });
  }

  const salesRows = await insertPosSalesRows(db, salesRowInputs);

  const summary = await getImportSummary(db, posImport.id);
  const hasIssues = summary.unmappedCount > 0 || summary.needsReviewCount > 0;

  const finalStatus = hasIssues ? "pending" : "processed";
  await updatePosImportStatus(db, posImport.id, finalStatus);

  const importSummary: PosImportSummary = {
    ...posImport,
    status: finalStatus,
    ...summary,
  };

  return { import: { ...posImport, status: finalStatus }, summary: importSummary, salesRows };
}

export interface DeductionItem {
  inventoryItemId: string;
  inventoryItemName: string;
  baseQtyDeducted: number;
  cogsFils: number;
}

export interface ProcessResult {
  deductions: DeductionItem[];
  alreadyDeducted: boolean;
}

export async function processImportInventory(
  db: SupabaseClient,
  importId: string,
): Promise<ProcessResult> {
  const posImport = await getPosImport(db, importId);
  if (!posImport) throw new Error("Import not found");

  if (posImport.inventoryDeducted) {
    return { deductions: [], alreadyDeducted: true };
  }

  if (posImport.status !== "processed") {
    throw new Error(
      `Import status is "${posImport.status}" — must be "processed" before inventory can be deducted. Resolve unmapped items first.`,
    );
  }

  const salesRows = await listPosSalesRows(db, importId);
  const mappedRows = salesRows.filter((r) => r.status === "mapped" && r.productId);

  // Aggregate usage per inventory item, keeping the per-product split so the
  // usage ledger can attribute COGS to products and product groups. Products
  // and recipes are cached — several POS lines can map to the same product.
  const productCache = new Map<string, Awaited<ReturnType<typeof getProduct>>>();
  const recipeCache = new Map<
    string,
    Awaited<ReturnType<typeof getRecipeIngredients>>
  >();
  const perItemUsage = new Map<string, Map<string, number>>();

  for (const row of mappedRows) {
    const productId = row.productId!;

    // Safeguard: a product the owner rejected (voided) must never deduct stock,
    // even if it was previously mapped to this POS line.
    let product = productCache.get(productId);
    if (product === undefined) {
      product = await getProduct(db, productId);
      productCache.set(productId, product);
    }
    if (product && product.status === "voided") continue;

    let recipe = recipeCache.get(productId);
    if (recipe === undefined) {
      recipe = await getRecipeIngredients(db, productId);
      recipeCache.set(productId, recipe);
    }

    for (const ing of recipe) {
      let portions = perItemUsage.get(ing.inventoryItemId);
      if (!portions) {
        portions = new Map<string, number>();
        perItemUsage.set(ing.inventoryItemId, portions);
      }
      const qty = ing.qtyBase * row.qtySold;
      portions.set(productId, (portions.get(productId) ?? 0) + qty);
    }
  }

  const groups = await listProductGroups(db);
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));

  const deductions: DeductionItem[] = [];
  const usageRows: InsertInventoryUsageInput[] = [];

  for (const [inventoryItemId, portions] of perItemUsage) {
    const item = await getInventoryItem(db, inventoryItemId);
    if (!item) continue;

    const totalBaseQty = [...portions.values()].reduce((s, q) => s + q, 0);
    if (totalBaseQty <= 0) continue;

    // Deduct the FULL sold quantity — stock may go negative. The sale already
    // happened; clamping here would silently understate COGS (e.g. when a
    // purchase hasn't been entered yet). Negative items raise an owner alert.
    const result = consumeStockAllowNegative(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      totalBaseQty,
      fallbackUnitCostFils(item),
    );

    // Remember the pre-consumption average while one exists — it becomes the
    // fallback cost if this item is consumed past zero later.
    const preAvgFils =
      item.stockBaseQty > 0 && item.stockValueFils > 0
        ? item.stockValueFils / item.stockBaseQty
        : undefined;

    await adjustStock(
      db,
      inventoryItemId,
      result.state.baseQty,
      result.state.valueFils,
      preAvgFils,
    );

    deductions.push({
      inventoryItemId,
      inventoryItemName: item.name,
      baseQtyDeducted: totalBaseQty,
      cogsFils: result.cogsFils,
    });

    // Split the item's COGS across the products that consumed it,
    // proportionally by quantity. The last portion absorbs the rounding
    // remainder so the allocations always sum exactly to the item's COGS.
    const entries = [...portions.entries()];
    let allocated = 0;
    entries.forEach(([productId, qty], index) => {
      const isLast = index === entries.length - 1;
      const share = isLast
        ? result.cogsFils - allocated
        : Math.round((result.cogsFils * qty) / totalBaseQty);
      allocated += share;

      const product = productCache.get(productId);
      const groupId = product?.groupId ?? null;
      usageRows.push({
        occurredOn: posImport.reportDate,
        sourceType: "pos_import",
        sourceId: importId,
        usageClass: "sold",
        inventoryItemId,
        productId,
        productGroupId: groupId,
        productGroupName: groupId ? (groupNames.get(groupId) ?? null) : null,
        qtyBase: qty,
        cogsFils: share,
      });
    });
  }

  await insertUsageRows(db, usageRows);
  await setInventoryDeducted(db, importId, true, { deductions });

  return { deductions, alreadyDeducted: false };
}

export async function recheckImportStatus(
  db: SupabaseClient,
  importId: string,
): Promise<void> {
  const posImport = await getPosImport(db, importId);
  if (!posImport) return;
  if (posImport.status === "voided" || posImport.status === "failed") return;
  if (posImport.inventoryDeducted) return;

  const summary = await getImportSummary(db, importId);
  const hasIssues = summary.unmappedCount > 0 || summary.needsReviewCount > 0;
  const newStatus = hasIssues ? "pending" : "processed";

  if (posImport.status !== newStatus) {
    await updatePosImportStatus(db, importId, newStatus);
  }
}

export async function voidImport(
  db: SupabaseClient,
  importId: string,
): Promise<void> {
  const posImport = await getPosImport(db, importId);
  if (!posImport) throw new Error("Import not found");

  if (
    posImport.inventoryDeducted &&
    posImport.deductionDetails &&
    typeof posImport.deductionDetails === "object"
  ) {
    const details = posImport.deductionDetails as {
      deductions?: DeductionItem[];
    };
    if (details.deductions) {
      for (const d of details.deductions) {
        const item = await getInventoryItem(db, d.inventoryItemId);
        if (!item) continue;

        await adjustStock(
          db,
          d.inventoryItemId,
          item.stockBaseQty + d.baseQtyDeducted,
          item.stockValueFils + d.cogsFils,
        );
      }
    }

    // The usage ledger must mirror deduction_details exactly — a voided
    // import's consumption never appears in COGS reports.
    await deleteUsageBySource(db, "pos_import", importId);
  }

  await updatePosImportStatus(db, importId, "voided");
}
