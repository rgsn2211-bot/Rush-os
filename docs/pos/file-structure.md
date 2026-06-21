# POS File Structure Report

Status: **Inspection complete — importer not yet built.**
Based on two real sample exports provided 2026-06-21.

> Decision locked: workers will export **one day at a time** (the 21-day samples
> were only to show the format). The importer assumes a single report date per file.

---

## File 1 — Sales By Item (drives inventory usage + COGS)

- Workbook: single sheet named `Worksheet`, range `A1:E37`.
- Row 1: title, merged `A1:E1` — e.g. `"Rush Specialty Cofee "` (POS misspells "Coffee"; trailing space).
- Row 2: merged `A2:E2` — e.g. `"Riffa | Sales By Item for period 2026-06-01 to 2026-06-21 "`.
  **Branch and report period are parsed from here.**
- Row 3: header row — `Id | Item Name | Category | Qty Sold | Amount`.
- Rows 4..N: data, sorted/grouped by Category (COLD, CUPS, Drinks, HOT, MACHA, MOJITO, REDBULL, SPECIALTY).
- Trailing blank row(s). No totals row in this sample, but the parser must tolerate one.

| Column | Header    | Type seen | Notes                                                                                |
| ------ | --------- | --------- | ------------------------------------------------------------------------------------ |
| A      | Id        | number    | **Stable POS product id** (e.g. 149). Primary mapping key.                           |
| B      | Item Name | text      | Display name. Has trailing spaces and typos (`"Capuccinno"`). Mapping fallback only. |
| C      | Category  | text      | Grouping label, trailing spaces (`"HOT "`). Informational.                           |
| D      | Qty Sold  | number    | Units sold in the period. Drives recipe-based inventory deduction.                   |
| E      | Amount    | number    | Gross sales (BHD) for the line. Reference only — EOD is the official revenue record. |

## File 2 — Complimentary Report (monetary control only)

- Workbook: single sheet named `Sheet1`, range `A1:H32`.
- Row 1: headers directly (no title rows): `OrderId | Cashier | Manager | Order Time Orders | Order Time Sales | Amount | Reason | Branch`.
- Rows 2..N: **one row per complimentary ORDER** — there are **no item names and no quantities.**

| Column | Header            | Type seen | Notes                                                                                                                                                                                     |
| ------ | ----------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | OrderId           | text      | Can repeat (saw `42105` twice). Not unique on its own.                                                                                                                                    |
| B      | Cashier           | text      |                                                                                                                                                                                           |
| C      | Manager           | text      |                                                                                                                                                                                           |
| D      | Order Time Orders | text      | The **date**, format `"21 Jun 2026"` (`DD Mon YYYY`).                                                                                                                                     |
| E      | Order Time Sales  | text      | The **time**, format `"03:59 pm"`.                                                                                                                                                        |
| F      | Amount            | **text**  | BHD as a string: `"2.000"`, `"2.300"`. Must parse text -> number (fils).                                                                                                                  |
| G      | Reason            | text      | Messy: `"loyalty cardOther"`, `"LOYALTY CARDCustomer Goodwill"`, `"loyaltry card"`, `"JASSIMOther"`. Looks like two concatenated fields (card/person + reason type). Needs normalization. |
| H      | Branch            | text      | e.g. `"Riffa"`.                                                                                                                                                                           |

---

## The two findings that shape the design

1. **Complimentary has no items, so it cannot deduct inventory** — even by accident.
   This structurally enforces the rule "complimentary is already in Sales By Item;
   never deduct it twice." The complimentary report is used only for monetary
   accountability: count of comp orders, total comp value, breakdown by reason / cashier / date.

2. **The two files are structurally different and must have separate adapters.**
   Sales By Item = item-level with a title/period header. Complimentary = order-level
   with headers on row 1 and the period only in the filename.

---

## Proposed normalized shape (to be confirmed before building)

**Raw layer** (stored exactly as read, never overwritten):

- `pos_import` (batch): id, report_type, branch, report_date, file_name, file_hash, uploaded_by, uploaded_at, status.
- `pos_raw_row`: import_id, sheet, row_number, raw_cells (json of the original values).

**Clean layer** (validated, normalized):

- Sales: import_id, raw_row_id, pos_item_id, pos_item_name, normalized_name, category, qty_sold, amount_fils.
- Complimentary: import_id, raw_row_id, order_id, cashier, manager, occurred_at, amount_fils, reason_card, reason_type.

**Processed layer:**

- POS item -> Rush product mapping (status: Mapped / Unmapped / Needs Review / Ignored).
- Recipe-based inventory usage per item (only from Sales By Item).
- Reconciliation summary linked into the daily closing.

Money is stored as **integer fils** (see `src/lib/calculations/currency.ts`).

## Validation rules (never silently skip a row)

Raise a warning/error and route to owner review when:

- POS item id/name has no mapping.
- Mapped product has no recipe.
- Qty missing, non-numeric, or negative (returns) — flag, do not auto-deduct.
- Amount unparseable.
- Report date/branch missing or inconsistent with filename.
- Duplicate import suspected (same hash, or same report_type + branch + date).
- Unknown sheet/column layout (fail safe — do not import guesses).

## Duplicate protection

Key on `file_hash` first, then on `report_type + branch + report_date`. On a
suspected duplicate, stop and show the previous import; only the owner can
intentionally replace/reprocess. Confirmed imports must be **idempotent** —
re-running must not double-deduct inventory.

## Test fixtures to create (anonymized, under `tests/fixtures/pos/`)

Valid sales, valid complimentary, duplicate upload, unmapped item, missing
recipe, blank/garbage rows, totals row present, qty-as-text, BHD text amount,
changed column order, unsupported layout, reprocess-without-double-deduct,
complimentary-not-deducted-twice.
