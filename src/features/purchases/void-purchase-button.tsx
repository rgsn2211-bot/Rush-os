"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface VoidPurchaseButtonProps {
  purchaseId: string;
}

export function VoidPurchaseButton({ purchaseId }: VoidPurchaseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVoid() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/purchases/${purchaseId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setError("Failed to void purchase");
      setLoading(false);
      return;
    }

    router.push("/owner/purchases");
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Void purchase
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleVoid} disabled={loading}>
          {loading ? "Voiding..." : "Confirm void"}
        </Button>
      </div>
      {error && <span className="text-rush-red text-xs">{error}</span>}
    </div>
  );
}
