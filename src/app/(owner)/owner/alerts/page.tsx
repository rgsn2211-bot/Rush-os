import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getOwnerAlerts } from "@/services/alerts";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle, ClipboardCheck } from "lucide-react";

export default async function AlertsPage() {
  const db = await createClient();
  await requireOwner(db);

  const alerts = await getOwnerAlerts(db);
  const lowStockAlerts = alerts.filter((a) => a.type === "low_stock");
  const reviewAlerts = alerts.filter((a) => a.type === "pending_review");

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle={
          alerts.length > 0
            ? `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} need attention`
            : "All clear"
        }
      />

      {alerts.length === 0 ? (
        <EmptyState message="No alerts right now. Everything looks good." />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Pending reviews */}
          {reviewAlerts.length > 0 && (
            <div>
              <h2 className="text-ink mb-3 flex items-center gap-2 text-base font-bold">
                <ClipboardCheck size={18} className="text-amber-500" />
                Pending Reviews
              </h2>
              {reviewAlerts.map((a) => (
                <Link key={a.id} href={a.link}>
                  <Card className="hover:border-navy transition-colors">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <div className="text-[15px] font-semibold">{a.title}</div>
                        <div className="text-ink-3 mt-0.5 text-sm">{a.detail}</div>
                      </div>
                      <Badge variant="amber">Review</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Low stock */}
          {lowStockAlerts.length > 0 && (
            <div>
              <h2 className="text-ink mb-3 flex items-center gap-2 text-base font-bold">
                <AlertTriangle size={18} className="text-rush-red" />
                Low Stock ({lowStockAlerts.length})
              </h2>
              <Card className="p-0">
                {lowStockAlerts.map((a, i) => (
                  <Link
                    key={a.id}
                    href={a.link}
                    className={`hover:bg-bg flex items-center justify-between px-5 py-3.5 ${
                      i > 0 ? "border-line-2 border-t" : ""
                    }`}
                  >
                    <div>
                      <div className="text-[15px] font-semibold">{a.title}</div>
                      <div className="text-ink-3 text-sm">{a.detail}</div>
                    </div>
                    <Badge variant="red">Low</Badge>
                  </Link>
                ))}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
