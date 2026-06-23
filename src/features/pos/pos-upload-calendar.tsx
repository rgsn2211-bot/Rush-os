"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PosImport } from "@/types/pos";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PosUploadCalendarProps {
  imports: PosImport[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function PosUploadCalendar({ imports, selectedDate, onSelectDate }: PosUploadCalendarProps) {
  const router = useRouter();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const importsByDate = new Map<string, PosImport>();
  for (const imp of imports) {
    importsByDate.set(imp.reportDate, imp);
  }

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

  function dotColor(imp: PosImport): string {
    if (imp.inventoryDeducted) return "bg-green-500";
    if (imp.status === "processed") return "bg-blue-500";
    return "bg-amber-400";
  }

  function cellBg(imp: PosImport): string {
    if (imp.inventoryDeducted) return "bg-green-50 hover:bg-green-100";
    if (imp.status === "processed") return "bg-blue-50 hover:bg-blue-100";
    return "bg-amber-50 hover:bg-amber-100";
  }

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDayClick(dateKey: string) {
    const imp = importsByDate.get(dateKey);
    if (imp) {
      router.push(`/owner/pos/${imp.id}`);
    } else {
      onSelectDate(selectedDate === dateKey ? null : dateKey);
    }
  }

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
            const imp = importsByDate.get(dateKey);
            const isToday = dateKey === todayKey;
            const isFuture = dateKey > todayKey;
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
                onClick={() => handleDayClick(dateKey)}
                className={`relative flex h-10 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  imp
                    ? `cursor-pointer ${cellBg(imp)}`
                    : isSelected
                      ? "cursor-pointer border-2 border-dashed border-navy bg-blue-50 text-navy"
                      : "cursor-pointer text-ink-3 hover:bg-gray-50"
                } ${isToday && !isSelected ? "ring-navy ring-1 ring-inset" : ""}`}
              >
                {day}
                {imp && (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${dotColor(imp)}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Deducted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Processed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Pending
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
