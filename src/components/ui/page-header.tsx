import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-ink text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-ink-2 mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  );
}
