"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./logo";
import { ownerNav } from "./owner-nav-config";

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="bg-navy sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col lg:flex">
      {/* Logo */}
      <div className="px-5 pt-[22px] pb-3.5">
        <Logo light />
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {ownerNav.map((item, i) => {
          if (item.type === "section") {
            return (
              <div
                key={i}
                className="px-3.5 pt-3.5 pb-1.5 text-[10.5px] font-bold tracking-wider text-white/40 uppercase"
              >
                {item.label}
              </div>
            );
          }

          const isActive =
            item.href === "/owner"
              ? pathname === "/owner"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/12 font-semibold text-white"
                  : "text-white/65 hover:bg-white/8 hover:text-white/85",
              )}
            >
              <Icon
                size={19}
                strokeWidth={1.9}
                className={isActive ? "text-white" : "text-white/65"}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="bg-rush-red flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11.5px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14">
            <User size={19} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-white">
              Owner
            </div>
            <div className="text-[11.5px] text-white/55">Rush OS</div>
          </div>
          <button onClick={handleSignOut} title="Sign out">
            <LogOut size={18} className="shrink-0 text-white/55 hover:text-white" />
          </button>
        </div>
      </div>
    </aside>
  );
}
