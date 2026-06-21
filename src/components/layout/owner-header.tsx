"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";

export function OwnerHeader() {
  return (
    <header className="border-line sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-8">
      {/* Search */}
      <div className="relative w-80 max-w-[40%]">
        <Search
          size={18}
          className="text-ink-3 absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          placeholder="Search items, products, costs…"
          className="bg-bg border-line focus:border-navy w-full rounded-[10px] border py-2.5 pr-3 pl-10 text-[13.5px] outline-none"
        />
      </div>

      <div className="flex items-center gap-3.5">
        {/* Branch indicator */}
        <div className="text-ink-2 flex items-center gap-[7px] text-[13px] font-semibold">
          <span className="bg-rush-green h-2 w-2 rounded-full" />
          Rush · Riffa
        </div>

        {/* Alert bell */}
        <Link
          href="/owner/alerts"
          className="border-line relative flex h-10 w-10 items-center justify-center rounded-[10px] border bg-white"
        >
          <Bell size={19} className="text-ink-2" />
          <span className="bg-rush-red absolute top-[7px] right-2 h-[7px] w-[7px] rounded-full" />
        </Link>
      </div>
    </header>
  );
}
