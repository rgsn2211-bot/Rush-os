import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRoleApi } from "@/lib/auth";
import { productCreateSchema } from "@/lib/validators/inventory";
import { getAllProducts, createProduct } from "@/services/products";

// Products (name/price, no cost) are worker-readable, so GET stays
// any-authenticated. Writes are owner + pos_manager.
export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const products = await getAllProducts(db);
  return Response.json(products);
}

export async function POST(request: NextRequest) {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const product = await createProduct(db, parsed.data, auth.id);
  return Response.json(product, { status: 201 });
}
