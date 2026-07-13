"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./logo";

const nav = [
  { label: "POS", href: "/pos-manager" },
  { label: "Products", href: "/pos-manager/products" },
  { label: "Inventory", href: "/pos-manager/inventory" },
];

export function PosManagerHeader() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/pos-manager") {
      // Home also owns the import-detail pages (/pos-manager/pos/...).
      return (
        pathname === "/pos-manager" || pathname.startsWith("/pos-manager/pos")
      );
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="bg-navy">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-[22px] py-3.5">
        <div className="flex items-center gap-6">
          <Logo light />
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${
                  isActive(item.href)
                    ? "bg-white/14 text-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[13.5px] font-semibold text-white">
              POS Manager
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/14 hover:bg-white/22 transition-colors"
          >
            <LogOut size={18} className="text-white/70" />
          </button>
        </div>
      </div>
    </header>
  );
}
