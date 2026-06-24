"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ownerMobileNav,
  ownerMoreLinks,
  activeMobileTab,
} from "./owner-nav-config";

export function OwnerMobileNav() {
  const pathname = usePathname();
  const active = activeMobileTab(pathname);
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 animate-in slide-in-from-bottom rounded-t-2xl bg-white pb-20 shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <span className="text-base font-bold">More</span>
              <button
                onClick={() => setShowMore(false)}
                className="text-ink-3 rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
              {ownerMoreLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-navy/8 text-navy font-semibold"
                        : "text-ink hover:bg-gray-50",
                    )}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="border-line sticky bottom-0 z-10 flex border-t bg-white pb-1 lg:hidden">
        {ownerMobileNav.map((item) => {
          const isMore = item.id === "more";
          const on = isMore ? active === "#more" || showMore : active === item.href;
          const Icon = item.icon;

          if (isMore) {
            return (
              <button
                key={item.id}
                onClick={() => setShowMore((v) => !v)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 px-1 pt-2.5 pb-2",
                  on ? "text-navy" : "text-ink-3",
                )}
              >
                <Icon size={22} strokeWidth={on ? 2.1 : 1.8} />
                <span
                  className={cn(
                    "text-[10.5px]",
                    on ? "font-bold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 pt-2.5 pb-2",
                on ? "text-navy" : "text-ink-3",
              )}
            >
              <Icon size={22} strokeWidth={on ? 2.1 : 1.8} />
              <span
                className={cn(
                  "text-[10.5px]",
                  on ? "font-bold" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
