"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  align?: "left" | "right" | "center";
  cell: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  emptyMessage = "No data.",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="text-ink-3 py-10 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-line-2 border-b">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "text-ink-3 px-5 py-3 text-xs font-semibold uppercase tracking-wider",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  !col.align && "text-left",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-line-2 border-b last:border-b-0",
                onRowClick && "hover:bg-bg cursor-pointer",
              )}
            >
              {columns.map((col, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "px-5 py-3.5",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.cell(row, ri)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
