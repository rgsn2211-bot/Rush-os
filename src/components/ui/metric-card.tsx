import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  accent?: string;
}

export function MetricCard({ label, value, accent }: MetricCardProps) {
  return (
    <div className="border-line bg-card rounded-xl border p-4">
      <div className="text-ink-3 text-xs font-semibold">{label}</div>
      <div
        className={cn("font-mono mt-1 text-lg font-bold", !accent && "text-ink")}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
