import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PosImport,
  PosRawRow,
  PosSalesRow,
} from "@/types/pos";

export interface InsertPosImportInput {
  reportType: string;
  branch: string;
  reportDate: string;
  fileName: string;
  fileHash: string;
  uploadedBy: string;
  status?: string;
  rowCount?: number;
  errorSummary?: string;
}

export interface InsertPosRawRowInput {
  importId: string;
  sheet: string;
  rowNumber: number;
  rawCells: unknown[];
}

export interface InsertPosSalesRowInput {
  importId: string;
  rawRowId: string | null;
  posItemId: number;
  posItemName: string;
  category: string | null;
  qtySold: number;
  amountFils: number;
  productId: string | null;
  status: string;
}

export async function insertPosImport(
  db: SupabaseClient,
  input: InsertPosImportInput,
): Promise<PosImport> {
  const { data, error } = await db
    .from("pos_imports")
    .insert({
      report_type: input.reportType,
      branch: input.branch,
      report_date: input.reportDate,
      file_name: input.fileName,
      file_hash: input.fileHash,
      uploaded_by: input.uploadedBy,
      status: input.status ?? "pending",
      row_count: input.rowCount ?? null,
      error_summary: input.errorSummary ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toPosImport(data);
}

export async function getPosImport(
  db: SupabaseClient,
  id: string,
): Promise<PosImport | null> {
  const { data, error } = await db
    .from("pos_imports")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toPosImport(data);
}

export async function listPosImports(
  db: SupabaseClient,
): Promise<PosImport[]> {
  const { data, error } = await db
    .from("pos_imports")
    .select("*")
    .neq("status", "voided")
    .order("report_date", { ascending: false });

  if (error) throw error;
  return data.map(toPosImport);
}

export async function updatePosImportStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  errorSummary?: string,
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (errorSummary !== undefined) updates.error_summary = errorSummary;

  const { error } = await db
    .from("pos_imports")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function setInventoryDeducted(
  db: SupabaseClient,
  id: string,
  deducted: boolean,
  deductionDetails?: unknown,
): Promise<void> {
  const updates: Record<string, unknown> = { inventory_deducted: deducted };
  if (deductionDetails !== undefined)
    updates.deduction_details = deductionDetails;

  const { error } = await db
    .from("pos_imports")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function getPosImportByHash(
  db: SupabaseClient,
  hash: string,
): Promise<PosImport | null> {
  const { data, error } = await db
    .from("pos_imports")
    .select("*")
    .eq("file_hash", hash)
    .neq("status", "voided")
    .maybeSingle();

  if (error) throw error;
  return data ? toPosImport(data) : null;
}

export async function getPosImportByDateBranch(
  db: SupabaseClient,
  reportType: string,
  branch: string,
  reportDate: string,
): Promise<PosImport | null> {
  const { data, error } = await db
    .from("pos_imports")
    .select("*")
    .eq("report_type", reportType)
    .eq("branch", branch)
    .eq("report_date", reportDate)
    .neq("status", "voided")
    .maybeSingle();

  if (error) throw error;
  return data ? toPosImport(data) : null;
}

export async function insertPosRawRows(
  db: SupabaseClient,
  rows: InsertPosRawRowInput[],
): Promise<PosRawRow[]> {
  if (rows.length === 0) return [];

  const dbRows = rows.map((r) => ({
    import_id: r.importId,
    sheet: r.sheet,
    row_number: r.rowNumber,
    raw_cells: r.rawCells,
  }));

  const { data, error } = await db
    .from("pos_raw_rows")
    .insert(dbRows)
    .select("*");

  if (error) throw error;
  return data.map(toPosRawRow);
}

export async function insertPosSalesRows(
  db: SupabaseClient,
  rows: InsertPosSalesRowInput[],
): Promise<PosSalesRow[]> {
  if (rows.length === 0) return [];

  const dbRows = rows.map((r) => ({
    import_id: r.importId,
    raw_row_id: r.rawRowId,
    pos_item_id: r.posItemId,
    pos_item_name: r.posItemName,
    category: r.category,
    qty_sold: r.qtySold,
    amount_fils: r.amountFils,
    product_id: r.productId,
    status: r.status,
  }));

  const { data, error } = await db
    .from("pos_sales_rows")
    .insert(dbRows)
    .select("*");

  if (error) throw error;
  return data.map(toPosSalesRow);
}

export async function listPosSalesRows(
  db: SupabaseClient,
  importId: string,
): Promise<PosSalesRow[]> {
  const { data, error } = await db
    .from("pos_sales_rows")
    .select("*")
    .eq("import_id", importId)
    .order("pos_item_id");

  if (error) throw error;
  return data.map(toPosSalesRow);
}

export async function updateSalesRowMapping(
  db: SupabaseClient,
  importId: string,
  posItemId: number,
  status: string,
  productId: string | null,
): Promise<void> {
  const { error } = await db
    .from("pos_sales_rows")
    .update({ status, product_id: productId })
    .eq("import_id", importId)
    .eq("pos_item_id", posItemId);

  if (error) throw error;
}

export async function updateAllSalesRowsByPosItemId(
  db: SupabaseClient,
  posItemId: number,
  status: string,
  productId: string | null,
): Promise<void> {
  const { error } = await db
    .from("pos_sales_rows")
    .update({ status, product_id: productId })
    .eq("pos_item_id", posItemId)
    .in("status", ["unmapped", "mapped"]);

  if (error) throw error;
}

export async function getImportSummary(
  db: SupabaseClient,
  importId: string,
): Promise<{
  mappedCount: number;
  unmappedCount: number;
  needsReviewCount: number;
  ignoredCount: number;
}> {
  const { data, error } = await db
    .from("pos_sales_rows")
    .select("status")
    .eq("import_id", importId);

  if (error) throw error;

  let mappedCount = 0;
  let unmappedCount = 0;
  let needsReviewCount = 0;
  let ignoredCount = 0;

  for (const row of data) {
    switch (row.status) {
      case "mapped":
        mappedCount++;
        break;
      case "unmapped":
        unmappedCount++;
        break;
      case "needs_review":
        needsReviewCount++;
        break;
      case "ignored":
        ignoredCount++;
        break;
    }
  }

  return { mappedCount, unmappedCount, needsReviewCount, ignoredCount };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPosImport(row: any): PosImport {
  return {
    id: row.id,
    reportType: row.report_type,
    branch: row.branch,
    reportDate: row.report_date,
    fileName: row.file_name,
    fileHash: row.file_hash,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    status: row.status,
    rowCount: row.row_count,
    errorSummary: row.error_summary,
    inventoryDeducted: row.inventory_deducted,
    deductionDetails: row.deduction_details,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPosRawRow(row: any): PosRawRow {
  return {
    id: row.id,
    importId: row.import_id,
    sheet: row.sheet,
    rowNumber: row.row_number,
    rawCells: row.raw_cells,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPosSalesRow(row: any): PosSalesRow {
  return {
    id: row.id,
    importId: row.import_id,
    rawRowId: row.raw_row_id,
    posItemId: row.pos_item_id,
    posItemName: row.pos_item_name,
    category: row.category,
    qtySold: Number(row.qty_sold),
    amountFils: Number(row.amount_fils),
    productId: row.product_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export { toPosImport, toPosSalesRow };
