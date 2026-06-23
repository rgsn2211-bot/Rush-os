export type PosImportStatus = "pending" | "processed" | "failed" | "voided";
export type PosSalesRowStatus =
  | "mapped"
  | "unmapped"
  | "needs_review"
  | "ignored";

export interface PosImport {
  id: string;
  reportType: string;
  branch: string;
  reportDate: string;
  fileName: string;
  fileHash: string;
  uploadedBy: string | null;
  uploadedAt: string;
  status: PosImportStatus;
  rowCount: number | null;
  errorSummary: string | null;
  inventoryDeducted: boolean;
  deductionDetails: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface PosRawRow {
  id: string;
  importId: string;
  sheet: string;
  rowNumber: number;
  rawCells: unknown[];
}

export interface PosItemCatalog {
  id: string;
  posItemId: number;
  posItemName: string;
  posCategory: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  productId: string | null;
  ignore: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PosSalesRow {
  id: string;
  importId: string;
  rawRowId: string | null;
  posItemId: number;
  posItemName: string;
  category: string | null;
  qtySold: number;
  amountFils: number;
  productId: string | null;
  status: PosSalesRowStatus;
  createdAt: string;
}

export interface ComplimentaryLog {
  id: string;
  description: string;
  amountFils: number;
  reason: string;
  notes: string | null;
  occurredAt: string;
  status: string;
  createdBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PosItemCatalogWithProduct extends PosItemCatalog {
  productName: string | null;
  hasRecipe: boolean;
}

export interface PosImportSummary extends PosImport {
  mappedCount: number;
  unmappedCount: number;
  needsReviewCount: number;
  ignoredCount: number;
}

export interface ComplimentaryLogWithSubmitter extends ComplimentaryLog {
  submitterName: string | null;
}
