import { Card, CardContent } from "./card";

interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="text-ink-3 py-12 text-center">
        <p className="text-sm">{message}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
