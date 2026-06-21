import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function NewInventoryItemPage() {
  return (
    <div>
      <Link
        href="/owner/inventory"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to inventory
      </Link>
      <PageHeader
        title="Add Inventory Item"
        subtitle="Start simple — fill in advanced settings later"
      />
      <div className="text-ink-2 border-line rounded-[14px] border bg-white px-5 py-12 text-center text-sm">
        <p>Inventory item form — coming next.</p>
        <Link href="/owner/inventory" className="mt-4 inline-block">
          <Button variant="secondary">Back to Inventory</Button>
        </Link>
      </div>
    </div>
  );
}
