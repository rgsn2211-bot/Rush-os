import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function NewProductPage() {
  return (
    <div>
      <Link
        href="/owner/products"
        className="text-ink-2 hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
      >
        &larr; Back to products
      </Link>
      <PageHeader
        title="Add Product"
        subtitle="Each size or hot/cold variant is a separate product"
      />
      <div className="text-ink-2 border-line rounded-[14px] border bg-white px-5 py-12 text-center text-sm">
        <p>Product form with recipe editor — coming next.</p>
        <Link href="/owner/products" className="mt-4 inline-block">
          <Button variant="secondary">Back to Products</Button>
        </Link>
      </div>
    </div>
  );
}
