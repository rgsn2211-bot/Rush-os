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
  Users,
  ShoppingCart,
  Upload,
} from "lucide-react";

export type OwnerNavLink = {
  type: "link";
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

export type OwnerNavItem = OwnerNavLink | { type: "section"; label: string };

/** Full owner navigation — used by the desktop sidebar. */
export const ownerNav: OwnerNavItem[] = [
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
  {
    type: "link",
    id: "purchases",
    label: "Purchases",
    href: "/owner/purchases",
    icon: ShoppingCart,
  },
  {
    type: "link",
    id: "suppliers",
    label: "Suppliers",
    href: "/owner/suppliers",
    icon: Users,
  },
  {
    type: "link",
    id: "pos",
    label: "POS Manager",
    href: "/owner/pos",
    icon: Upload,
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

/**
 * Condensed bottom navigation for phones — five primary destinations.
 * Matches ownerMobile.jsx in the design prototype.
 */
export const ownerMobileNav: OwnerNavLink[] = [
  {
    type: "link",
    id: "dashboard",
    label: "Dashboard",
    href: "/owner",
    icon: LayoutGrid,
  },
  {
    type: "link",
    id: "alerts",
    label: "Alerts",
    href: "/owner/alerts",
    icon: Bell,
  },
  {
    type: "link",
    id: "inventory",
    label: "Inventory",
    href: "/owner/inventory",
    icon: Package,
  },
  {
    type: "link",
    id: "money",
    label: "Money",
    href: "/owner/money",
    icon: Banknote,
  },
  {
    type: "link",
    id: "reports",
    label: "Reports",
    href: "/owner/profit",
    icon: BarChart3,
  },
];

/**
 * Which bottom-nav tab should highlight for a given pathname. The phone groups
 * the finance/reporting pages under the single "Reports" tab.
 */
export function activeMobileTab(pathname: string): string {
  if (pathname === "/owner") return "/owner";
  if (pathname.startsWith("/owner/alerts")) return "/owner/alerts";
  if (
    pathname.startsWith("/owner/inventory") ||
    pathname.startsWith("/owner/products") ||
    pathname.startsWith("/owner/pos")
  )
    return "/owner/inventory";
  if (pathname.startsWith("/owner/money")) return "/owner/money";
  if (
    pathname.startsWith("/owner/profit") ||
    pathname.startsWith("/owner/delivery") ||
    pathname.startsWith("/owner/complimentary") ||
    pathname.startsWith("/owner/losses")
  )
    return "/owner/profit";
  return "/owner";
}
