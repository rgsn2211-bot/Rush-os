import "server-only";
import * as XLSX from "xlsx";
import { bhdToFils } from "@/lib/calculations/currency";

export interface ParsedSalesHeader {
  title: string;
  branch: string;
  periodStart: string;
  periodEnd: string;
}

export interface ParsedSalesRow {
  rowNumber: number;
  rawCells: unknown[];
  posItemId: number;
  itemName: string;
  category: string;
  qtySold: number;
  amountFils: number;
}

export interface ParsedSalesWarning {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ParseSalesResult {
  header: ParsedSalesHeader;
  rows: ParsedSalesRow[];
  warnings: ParsedSalesWarning[];
  skippedRows: { rowNumber: number; rawCells: unknown[]; reason: string }[];
}

const EXPECTED_HEADERS = ["id", "item name", "category", "qty sold", "amount"];

const PERIOD_RE =
  /^(.+?)\s*\|\s*Sales By Item for period\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i;

export function parseSalesByItemXlsx(buffer: ArrayBuffer): ParseSalesResult {
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheet = workbook.Sheets["Worksheet"];
  if (!sheet) {
    throw new Error(
      `Sheet "Worksheet" not found. Available sheets: ${workbook.SheetNames.join(", ")}`,
    );
  }

  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (aoa.length < 4) {
    throw new Error(
      "File has fewer than 4 rows — expected title, branch/period, headers, and data.",
    );
  }

  const titleRow = String(aoa[0]?.[0] ?? "").trim();
  if (!titleRow.toLowerCase().includes("rush")) {
    throw new Error(
      `Row 1 title does not contain "Rush". Got: "${titleRow}"`,
    );
  }

  const periodRow = String(aoa[1]?.[0] ?? "").trim();
  const periodMatch = periodRow.match(PERIOD_RE);
  if (!periodMatch) {
    throw new Error(
      `Row 2 does not match expected format "Branch | Sales By Item for period YYYY-MM-DD to YYYY-MM-DD". Got: "${periodRow}"`,
    );
  }
  const branch = periodMatch[1].trim();
  const periodStart = periodMatch[2];
  const periodEnd = periodMatch[3];

  const headerRow = (aoa[2] ?? []).map((c) =>
    String(c).trim().toLowerCase(),
  );
  for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (headerRow[i] !== EXPECTED_HEADERS[i]) {
      throw new Error(
        `Header mismatch at column ${i + 1}: expected "${EXPECTED_HEADERS[i]}", got "${headerRow[i] ?? "(empty)"}".`,
      );
    }
  }

  const header: ParsedSalesHeader = {
    title: titleRow,
    branch,
    periodStart,
    periodEnd,
  };

  const rows: ParsedSalesRow[] = [];
  const warnings: ParsedSalesWarning[] = [];
  const skippedRows: ParseSalesResult["skippedRows"] = [];

  for (let i = 3; i < aoa.length; i++) {
    const row = aoa[i];
    const rowNumber = i + 1;
    const rawCells = [...(row ?? [])];

    if (!row || row.every((c) => c === "" || c == null)) {
      continue;
    }

    const rawId = row[0];
    const posItemId = Number(rawId);
    if (!Number.isInteger(posItemId) || posItemId <= 0) {
      skippedRows.push({
        rowNumber,
        rawCells,
        reason: `Non-integer or non-positive Id: "${rawId}"`,
      });
      continue;
    }

    const itemName = String(row[1] ?? "").trim();
    const category = String(row[2] ?? "").trim();

    const rawQty = row[3];
    const qtySold = Number(rawQty);
    if (isNaN(qtySold)) {
      warnings.push({
        rowNumber,
        field: "Qty Sold",
        message: `Non-numeric quantity: "${rawQty}"`,
      });
      skippedRows.push({ rowNumber, rawCells, reason: "Non-numeric quantity" });
      continue;
    }
    if (qtySold < 0) {
      warnings.push({
        rowNumber,
        field: "Qty Sold",
        message: `Negative quantity (return?): ${qtySold}`,
      });
    }

    const rawAmount = row[4];
    let amountFils = 0;
    const parsedAmount = Number(rawAmount);
    if (isNaN(parsedAmount)) {
      warnings.push({
        rowNumber,
        field: "Amount",
        message: `Unparseable amount: "${rawAmount}"`,
      });
    } else {
      amountFils = bhdToFils(parsedAmount);
    }

    rows.push({
      rowNumber,
      rawCells,
      posItemId,
      itemName,
      category,
      qtySold,
      amountFils,
    });
  }

  return { header, rows, warnings, skippedRows };
}
