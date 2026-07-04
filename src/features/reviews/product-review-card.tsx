"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Owner review card for a worker-created product. Approving just confirms it (no
 * stock effect); rejecting voids it so POS imports won't deduct against it.
 */
export function ProductReviewCard({
  productId,
  submitterName,
}: {
  productId: string;
  submitterName: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setError(null);
    setLoading(action);
    const res = await fetch(`/api/products/${productId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to review");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent>
        <h2 className="text-ink text-base font-bold">Needs your review</h2>
        <p className="text-ink-2 mt-1 text-sm">
          Created by {submitterName ?? "a worker"}. Check the recipe and price,
          then approve — or reject to void it.
        </p>

        {error && (
          <div className="bg-rush-red-bg text-rush-red mt-3 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Button onClick={() => submit("approve")} disabled={loading !== null}>
            {loading === "approve" ? "Approving..." : "Approve"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => submit("reject")}
            disabled={loading !== null}
          >
            {loading === "reject" ? "Rejecting..." : "Reject"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
