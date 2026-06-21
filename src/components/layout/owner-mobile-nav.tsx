"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ownerMobileNav, activeMobileTab } from "./owner-nav-config";

/**
 * Bottom navigation bar shown only on phones (hidden on desktop). Five primary
 * destinations, matching the prototype's owner mobile app.
 */
export function OwnerMobileNav() {
  const pathname = usePathname();
  const active = activeMobileTab(pathname);

  return (
    <nav className="border-line sticky bottom-0 z-10 flex border-t bg-white pb-1 lg:hidden">
      {ownerMobileNav.map((item) => {
        const on = active === item.href;
        const Icon = item.icon;
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
              className={cn("text-[10.5px]", on ? "font-bold" : "font-medium")}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
