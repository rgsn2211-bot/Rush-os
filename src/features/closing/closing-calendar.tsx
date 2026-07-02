"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** One day's closing as far as the calendar cares: its date and (optionally) status. */
export interface ClosingCalendarEntry {
  reportDate: string;
  /** "approved" | "needs_review". Omitted when only the date is known (worker view). */
  status?: string;
}

interface ClosingCalendarProps {
  closings: ClosingCalendarEntry[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  /** Today in Bahrain (YYYY-MM-DD). Future days are disabled. */
  today: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ClosingCalendar({
  closings,
  selectedDate,
  onSelectDate,
  today,
}: ClosingCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const byDate = new Map<string, ClosingCalendarEntry>();
  for (const c of closings) byDate.set(c.reportDate, c);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  // A closing's dot/background colour by status. Without a status (worker view),
  // fall back to a neutral "closed" colour.
  function dotColor(entry: ClosingCalendarEntry): string {
    if (entry.status === "approved") return "bg-green-500";
    if (entry.status === "needs_review") return "bg-amber-400";
    return "bg-navy";
  }
  function cellBg(entry: ClosingCalendarEntry): string {
    if (entry.status === "approved") return "bg-green-50 hover:bg-green-100";
    if (entry.status === "needs_review") return "bg-amber-50 hover:bg-amber-100";
    return "bg-blue-50 hover:bg-blue-100";
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card className="mb-4">
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="text-ink-3 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-sm font-semibold">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button
            onClick={nextMonth}
            className="text-ink-3 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-ink-3 pb-1.5 text-center text-[11px] font-medium uppercase"
            >
              {d}
            </div>
          ))}

          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-10" />;
            }

            const dateKey = toDateKey(viewYear, viewMonth, day);
            const entry = byDate.get(dateKey);
            const isToday = dateKey === today;
            const isFuture = dateKey > today;
            const isSelected = dateKey === selectedDate;

            if (isFuture) {
              return (
                <div
                  key={dateKey}
                  className="flex h-10 items-center justify-center rounded-lg text-xs font-medium text-gray-300"
                >
                  {day}
                </div>
              );
            }

            return (
              <button
                key={dateKey}
                onClick={() =>
                  onSelectDate(selectedDate === dateKey ? null : dateKey)
                }
                className={`relative flex h-10 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? "cursor-pointer border-2 border-dashed border-navy bg-blue-50 text-navy"
                    : entry
                      ? `cursor-pointer ${cellBg(entry)}`
                      : "cursor-pointer text-ink-3 hover:bg-gray-50"
                } ${isToday && !isSelected ? "ring-navy ring-1 ring-inset" : ""}`}
              >
                {day}
                {entry && !isSelected && (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${dotColor(entry)}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
