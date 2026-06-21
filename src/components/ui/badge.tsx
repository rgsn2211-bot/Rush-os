import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold",
  {
    variants: {
      variant: {
        default: "bg-bg text-ink-2",
        green: "bg-rush-green-bg text-rush-green",
        amber: "bg-rush-amber-bg text-rush-amber",
        red: "bg-rush-red-bg text-rush-red",
        blue: "bg-rush-blue-bg text-rush-blue",
        navy: "bg-navy text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
