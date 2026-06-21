import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Package,
  Clock,
  Trash2,
  Banknote,
  ClipboardList,
} from "lucide-react";

const actions = [
  {
    label: "Inventory Alerts",
    desc: "Low, expiring & expired items",
    icon: Bell,
  },
  {
    label: "Record Supplier Purchase",
    desc: "Delivery or purchase received",
    icon: Package,
  },
  {
    label: "Mark Item Opened",
    desc: "Start after-opening use-by",
    icon: Clock,
  },
  {
    label: "Record Waste",
    desc: "Log spoiled or damaged items",
    icon: Trash2,
  },
  {
    label: "Cash Out from Register",
    desc: "Purchases, expenses, withdrawals",
    icon: Banknote,
  },
  {
    label: "Inventory Count",
    desc: "Monthly full stock count",
    icon: ClipboardList,
  },
];

export default function WorkerHome() {
  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-ink text-2xl font-bold tracking-tight">
          Good evening
        </h1>
        <p className="text-ink-3 mt-[3px] text-[14.5px]">
          Worker Tablet · Phase 0
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
            Checklist will be active once daily closing is built in Phase 3.
          </p>
        </CardContent>
      </Card>

      <Button variant="primary" size="xl" full className="mb-[18px] shadow-md">
        Start Daily Closing
      </Button>

      <div className="text-ink-3 mb-3 text-[13px] font-bold tracking-wider uppercase">
        Quick Actions
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              className="border-line hover:border-navy-soft flex min-h-[130px] flex-col gap-3 rounded-2xl border bg-white p-[18px] text-left transition-colors"
            >
              <div className="bg-bg flex h-[50px] w-[50px] items-center justify-center rounded-[13px]">
                <Icon size={26} className="text-navy" strokeWidth={1.9} />
              </div>
              <div>
                <div className="text-ink text-base font-bold">{a.label}</div>
                <div className="text-ink-3 mt-[3px] text-[13px] leading-snug">
                  {a.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
