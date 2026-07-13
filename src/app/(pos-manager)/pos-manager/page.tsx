import { createClient } from "@/lib/supabase/server";
import { requirePosManager } from "@/lib/auth";
import { listPosItemCatalogWithProducts } from "@/repositories/pos-catalog";
import { listProducts } from "@/repositories/products";
import { listPosImports } from "@/repositories/pos-imports";
import { PageHeader } from "@/components/ui/page-header";
import { PosManager } from "@/features/pos/pos-manager";

export default async function PosManagerHomePage() {
  const db = await createClient();
  await requirePosManager(db);

  const [catalog, products, imports] = await Promise.all([
    listPosItemCatalogWithProducts(db),
    listProducts(db),
    listPosImports(db),
  ]);

  return (
    <div>
      <PageHeader
        title="POS Manager"
        subtitle="Map POS items, upload sales data, and debug inventory links"
      />
      <PosManager
        catalog={catalog}
        products={products}
        imports={imports}
        importDetailBase="/pos-manager/pos"
      />
    </div>
  );
}
