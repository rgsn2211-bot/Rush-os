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
import { getRecipeIngredients } from "@/repositories/products";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
import { consumeStock } from "@/lib/calculations/costing";

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
): Promise<UploadResult> {
  const fileHash = await computeFileHash(fileBuffer);

  const existingHash = await getPosImportByHash(db, fileHash);
  if (existingHash) {
    throw new Error(
      `This exact file was already uploaded on ${existingHash.uploadedAt} (import ${existingHash.id}). Void the previous import first to re-upload.`,
    );
  }

  const parsed = parseSalesByItemXlsx(fileBuffer);

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

  const aggregatedUsage = new Map<string, number>();

  for (const row of mappedRows) {
    const recipe = await getRecipeIngredients(db, row.productId!);
    for (const ing of recipe) {
      const key = ing.inventoryItemId;
      const totalQty = ing.qtyBase * row.qtySold;
      aggregatedUsage.set(key, (aggregatedUsage.get(key) ?? 0) + totalQty);
    }
  }

  const deductions: DeductionItem[] = [];

  for (const [inventoryItemId, totalBaseQty] of aggregatedUsage) {
    const item = await getInventoryItem(db, inventoryItemId);
    if (!item) continue;

    const qtyToDeduct = Math.min(totalBaseQty, item.stockBaseQty);
    if (qtyToDeduct <= 0) continue;

    const result = consumeStock(
      { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
      qtyToDeduct,
    );

    await adjustStock(
      db,
      inventoryItemId,
      result.state.baseQty,
      result.state.valueFils,
    );

    deductions.push({
      inventoryItemId,
      inventoryItemName: item.name,
      baseQtyDeducted: qtyToDeduct,
      cogsFils: result.cogsFils,
    });
  }

  await setInventoryDeducted(db, importId, true, { deductions });

  return { deductions, alreadyDeducted: false };
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
  }

  await updatePosImportStatus(db, importId, "voided");
}
