"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardCheck,
  Bell,
  Package,
  Tag,
  Banknote,
  BarChart3,
  Truck,
  Gift,
  Trash2,
  Sparkles,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

type NavItem =
  | {
      type: "link";
      id: string;
      label: string;
      href: string;
      icon: React.ElementType;
      badge?: number;
    }
  | { type: "section"; label: string };

const nav: NavItem[] = [
  {
    type: "link",
    id: "dashboard",
    label: "Dashboard",
    href: "/owner",
    icon: LayoutGrid,
  },
  {
    type: "link",
    id: "review",
    label: "Review Center",
    href: "/owner/review",
    icon: ClipboardCheck,
  },
  {
    type: "link",
    id: "alerts",
    label: "Alerts",
    href: "/owner/alerts",
    icon: Bell,
  },
  { type: "section", label: "Operations" },
  {
    type: "link",
    id: "inventory",
    label: "Inventory",
    href: "/owner/inventory",
    icon: Package,
  },
  {
    type: "link",
    id: "products",
    label: "Product Costing",
    href: "/owner/products",
    icon: Tag,
  },
  { type: "section", label: "Finance" },
  {
    type: "link",
    id: "money",
    label: "Money",
    href: "/owner/money",
    icon: Banknote,
  },
  {
    type: "link",
    id: "profit",
    label: "Profit Reports",
    href: "/owner/profit",
    icon: BarChart3,
  },
  {
    type: "link",
    id: "delivery",
    label: "Delivery Apps",
    href: "/owner/delivery",
    icon: Truck,
  },
  {
    type: "link",
    id: "comp",
    label: "Complimentary",
    href: "/owner/complimentary",
    icon: Gift,
  },
  {
    type: "link",
    id: "losses",
    label: "Losses",
    href: "/owner/losses",
    icon: Trash2,
  },
  { type: "section", label: "More" },
  {
    type: "link",
    id: "ai",
    label: "AI Insights",
    href: "/owner/ai",
    icon: Sparkles,
  },
];

export function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-navy sticky top-0 flex h-screen w-[244px] shrink-0 flex-col">
      {/* Logo */}
      <div className="px-5 pt-[22px] pb-3.5">
        <Logo light />
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((item, i) => {
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
          <Settings size={18} className="shrink-0 text-white/55" />
        </div>
      </div>
    </aside>
  );
}
