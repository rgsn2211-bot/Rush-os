"use client";

import Link from "next/link";
import { Bell, ClipboardCheck } from "lucide-react";
import { Logo } from "./logo";

/**
 * Navy top bar shown only on phones (hidden on desktop, which uses the sidebar
 * + white header instead). Mirrors the prototype's owner mobile header.
 */
export function OwnerMobileTopbar() {
  return (
    <header className="bg-navy flex items-center justify-between px-[18px] py-3.5 lg:hidden">
      <Logo light />
      <div className="flex items-center gap-2">
        <Link
          href="/owner/review"
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-white/14"
        >
          <ClipboardCheck size={19} className="text-white" />
          <span className="bg-rush-amber absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full" />
        </Link>
        <Link
          href="/owner/alerts"
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-white/14"
        >
          <Bell size={19} className="text-white" />
          <span className="bg-rush-red absolute top-2 right-[9px] h-[7px] w-[7px] rounded-full" />
        </Link>
      </div>
    </header>
  );
}
