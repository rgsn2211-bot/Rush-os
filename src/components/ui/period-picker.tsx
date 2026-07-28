"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthRange(year: number, month0: number): { from: string; to: string } {
  const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month0 + 1)}-01`,
    to: `${year}-${pad(month0 + 1)}-${pad(lastDay)}`,
  };
}

/**
 * Period selector for report pages. Month mode steps whole months; custom mode
 * exposes two date inputs. Writes ?from / ?to (both INCLUSIVE, YYYY-MM-DD) to
 * the URL so the server component refetches for the new period.
 */
export function PeriodPicker({
  fromInclusive,
  toInclusive,
}: {
  fromInclusive: string;
  toInclusive: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [fy, fm, fd] = fromInclusive.split("-").map(Number);
  const wholeMonth =
    fd === 1 && monthRange(fy, fm - 1).to === toInclusive;

  const [custom, setCustom] = useState(!wholeMonth);
  const [customFrom, setCustomFrom] = useState(fromInclusive);
  const [customTo, setCustomTo] = useState(toInclusive);

  const apply = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  };

  const stepMonth = (delta: number) => {
    const base = new Date(Date.UTC(fy, fm - 1 + delta, 1));
    const range = monthRange(base.getUTCFullYear(), base.getUTCMonth());
    apply(range.from, range.to);
  };

  return (
    <div className="border-line bg-card flex flex-wrap items-center gap-2 rounded-xl border p-2">
      {!custom ? (
        <>
          <button
            type="button"
            onClick={() => stepMonth(-1)}
            className="text-ink-2 hover:bg-bg hover:text-ink rounded-lg p-2 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-36 text-center text-sm font-bold">
            {wholeMonth
              ? `${MONTH_NAMES[fm - 1]} ${fy}`
              : `${fromInclusive} → ${toInclusive}`}
          </span>
          <button
            type="button"
            onClick={() => stepMonth(1)}
            className="text-ink-2 hover:bg-bg hover:text-ink rounded-lg p-2 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </>
      ) : (
        <>
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="border-line bg-bg text-ink h-9 rounded-lg border px-2 text-sm"
            aria-label="From date"
          />
          <span className="text-ink-3 text-sm">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
            className="border-line bg-bg text-ink h-9 rounded-lg border px-2 text-sm"
            aria-label="To date"
          />
          <Button
            size="sm"
            onClick={() => customFrom && customTo && apply(customFrom, customTo)}
          >
            Apply
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={() => setCustom((c) => !c)}
        className="text-navy ml-auto px-2 text-xs font-semibold hover:underline"
      >
        {custom ? "Pick a month" : "Custom dates"}
      </button>
    </div>
  );
}
