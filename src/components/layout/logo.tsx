import { cn } from "@/lib/utils";

export function Logo({
  light = false,
  className,
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="bg-navy flex h-7 w-7 items-center justify-center rounded-[7px]">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" x2="6" y1="2" y2="4" />
          <line x1="10" x2="10" y1="2" y2="4" />
          <line x1="14" x2="14" y1="2" y2="4" />
        </svg>
      </div>
      <div>
        <div
          className={cn(
            "text-sm leading-tight font-bold",
            light ? "text-white" : "text-ink",
          )}
        >
          Rush
        </div>
        <div
          className={cn(
            "text-[11px] leading-tight font-medium",
            light ? "text-white/60" : "text-ink-3",
          )}
        >
          OS
        </div>
      </div>
    </div>
  );
}
