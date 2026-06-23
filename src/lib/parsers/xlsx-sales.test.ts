import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseSalesByItemXlsx } from "./xlsx-sales";

function buildXlsx(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Worksheet");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf;
}

const VALID_ROWS = [
  ["Rush Specialty Cofee "],
  ["Riffa | Sales By Item for period 2026-06-01 to 2026-06-21 "],
  ["Id", "Item Name", "Category", "Qty Sold", "Amount"],
  [149, "Capuccinno ", "HOT ", 42, 58.8],
  [150, "Latte", "HOT", 35, 49.0],
  [201, "Iced Americano ", "COLD ", 18, 25.2],
];

describe("parseSalesByItemXlsx", () => {
  it("parses a valid Sales By Item file", () => {
    const result = parseSalesByItemXlsx(buildXlsx(VALID_ROWS));

    expect(result.header.title).toBe("Rush Specialty Cofee");
    expect(result.header.branch).toBe("Riffa");
    expect(result.header.periodStart).toBe("2026-06-01");
    expect(result.header.periodEnd).toBe("2026-06-21");

    expect(result.rows).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(0);
  });

  it("trims item names and categories", () => {
    const result = parseSalesByItemXlsx(buildXlsx(VALID_ROWS));

    expect(result.rows[0].itemName).toBe("Capuccinno");
    expect(result.rows[0].category).toBe("HOT");
    expect(result.rows[2].itemName).toBe("Iced Americano");
    expect(result.rows[2].category).toBe("COLD");
  });

  it("converts BHD amounts to fils", () => {
    const result = parseSalesByItemXlsx(buildXlsx(VALID_ROWS));

    expect(result.rows[0].amountFils).toBe(58800);
    expect(result.rows[1].amountFils).toBe(49000);
  });

  it("preserves POS item IDs as integers", () => {
    const result = parseSalesByItemXlsx(buildXlsx(VALID_ROWS));

    expect(result.rows[0].posItemId).toBe(149);
    expect(result.rows[1].posItemId).toBe(150);
    expect(result.rows[2].posItemId).toBe(201);
  });

  it("skips blank rows", () => {
    const rows = [
      ...VALID_ROWS,
      ["", "", "", "", ""],
      [],
    ];
    const result = parseSalesByItemXlsx(buildXlsx(rows));
    expect(result.rows).toHaveLength(3);
  });

  it("skips rows with non-integer Id (totals row)", () => {
    const rows = [
      ...VALID_ROWS,
      ["Total", "", "", 95, 133.0],
    ];
    const result = parseSalesByItemXlsx(buildXlsx(rows));

    expect(result.rows).toHaveLength(3);
    expect(result.skippedRows).toHaveLength(1);
    expect(result.skippedRows[0].reason).toContain("Non-integer");
  });

  it("warns on negative quantity", () => {
    const rows = [
      ...VALID_ROWS.slice(0, 3),
      [149, "Capuccinno", "HOT", -2, -2.8],
    ];
    const result = parseSalesByItemXlsx(buildXlsx(rows));

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].qtySold).toBe(-2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("Negative");
  });

  it("warns on unparseable amount but still includes the row", () => {
    const rows = [
      ...VALID_ROWS.slice(0, 3),
      [149, "Capuccinno", "HOT", 10, "N/A"],
    ];
    const result = parseSalesByItemXlsx(buildXlsx(rows));

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amountFils).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe("Amount");
  });

  it("throws on wrong sheet name", () => {
    const ws = XLSX.utils.aoa_to_sheet(VALID_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WrongName");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    expect(() => parseSalesByItemXlsx(buf)).toThrow('Sheet "Worksheet" not found');
  });

  it("throws on mismatched headers", () => {
    const rows = [
      VALID_ROWS[0],
      VALID_ROWS[1],
      ["ID", "Name", "Cat", "Qty", "Total"],
      [149, "Latte", "HOT", 10, 14.0],
    ];

    expect(() => parseSalesByItemXlsx(buildXlsx(rows))).toThrow(
      "Header mismatch",
    );
  });

  it("throws when title does not contain Rush", () => {
    const rows = [
      ["Some Other Coffee Shop"],
      VALID_ROWS[1],
      VALID_ROWS[2],
      VALID_ROWS[3],
    ];

    expect(() => parseSalesByItemXlsx(buildXlsx(rows))).toThrow(
      'does not contain "Rush"',
    );
  });

  it("throws on malformed period row", () => {
    const rows = [
      VALID_ROWS[0],
      ["Just some random text here"],
      VALID_ROWS[2],
      VALID_ROWS[3],
    ];

    expect(() => parseSalesByItemXlsx(buildXlsx(rows))).toThrow(
      "does not match expected format",
    );
  });

  it("throws on too few rows", () => {
    const rows = [VALID_ROWS[0], VALID_ROWS[1]];

    expect(() => parseSalesByItemXlsx(buildXlsx(rows))).toThrow(
      "fewer than 4 rows",
    );
  });

  it("skips rows with non-numeric quantity", () => {
    const rows = [
      ...VALID_ROWS.slice(0, 3),
      [149, "Capuccinno", "HOT", "abc", 10.0],
    ];
    const result = parseSalesByItemXlsx(buildXlsx(rows));

    expect(result.rows).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });

  it("handles qty sold as text number", () => {
    const rows = [
      ...VALID_ROWS.slice(0, 3),
      [149, "Capuccinno", "HOT", "42", 58.8],
    ];
    const result = parseSalesByItemXlsx(buildXlsx(rows));

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].qtySold).toBe(42);
  });
});
