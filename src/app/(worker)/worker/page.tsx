import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireWorker } from "@/lib/auth";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { countLowStock } from "@/services/alerts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Package,
  Clock,
  Trash2,
  Banknote,
  ClipboardList,
  Gift,
} from "lucide-react";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function WorkerHome() {
  const db = await createClient();
  const authUser = await requireWorker(db);
  const items = await listInventoryItemsOps(db);
  const lowCount = countLowStock(items);

  const actions = [
    {
      label: "Inventory Alerts",
      desc: "Low, expiring & expired items",
      icon: Bell,
      href: "/worker/alerts",
      badge: lowCount > 0 ? lowCount : undefined,
    },
    {
      label: "Record Supplier Purchase",
      desc: "Delivery or purchase received",
      icon: Package,
      href: "/worker/receive",
    },
    {
      label: "Log Complimentary",
      desc: "Record free items given out",
      icon: Gift,
      href: "/worker/complimentary",
    },
    {
      label: "Mark Item Opened",
      desc: "Start after-opening use-by",
      icon: Clock,
      href: null,
    },
    {
      label: "Record Waste",
      desc: "Log spoiled or damaged items",
      icon: Trash2,
      href: "/worker/waste",
    },
    {
      label: "Cash Out from Register",
      desc: "Purchases, expenses, withdrawals",
      icon: Banknote,
      href: null,
    },
    {
      label: "Inventory Count",
      desc: "Monthly full stock count",
      icon: ClipboardList,
      href: null,
    },
  ];

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-ink text-2xl font-bold tracking-tight">
          {greeting()}
        </h1>
        <p className="text-ink-3 mt-[3px] text-[14.5px]">
          {authUser.displayName || "Worker Tablet"}
        </p>
      </div>

      <Card className="mb-[18px]">
        <CardHeader>
          <div className="text-ink text-base font-bold">
            Today&apos;s Closing Checklist
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-ink-3 text-sm">
            When you finish your shift, tap{" "}
            <span className="text-ink font-semibold">Start Daily Closing</span>{" "}
            below to record the day&apos;s sales and cash count.
          </p>
        </CardContent>
      </Card>

      <Link href="/worker/closing" className="mb-[18px] block">
        <Button variant="primary" size="xl" full className="shadow-md">
          Start Daily Closing
        </Button>
      </Link>

      <div className="text-ink-3 mb-3 text-[13px] font-bold tracking-wider uppercase">
        Quick Actions
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        {actions.map((a) => {
          const Icon = a.icon;
          const inner = (
            <>
              <div className="bg-bg relative flex h-[50px] w-[50px] items-center justify-center rounded-[13px]">
                <Icon size={26} className="text-navy" strokeWidth={1.9} />
                {a.badge && (
                  <span className="bg-rush-red absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white">
                    {a.badge}
                  </span>
                )}
              </div>
              <div>
                <div className="text-ink text-base font-bold">{a.label}</div>
                <div className="text-ink-3 mt-[3px] text-[13px] leading-snug">
                  {a.desc}
                </div>
              </div>
            </>
          );

          if (a.href) {
            return (
              <Link
                key={a.label}
                href={a.href}
                className="border-line hover:border-navy-soft flex min-h-[130px] flex-col gap-3 rounded-2xl border bg-white p-[18px] text-left transition-colors"
              >
                {inner}
              </Link>
            );
          }

          return (
            <div
              key={a.label}
              className="border-line flex min-h-[130px] flex-col gap-3 rounded-2xl border bg-white p-[18px] text-left opacity-60"
            >
              {inner}
              <Badge variant="default" className="mt-auto w-fit text-[10px]">
                Coming soon
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
