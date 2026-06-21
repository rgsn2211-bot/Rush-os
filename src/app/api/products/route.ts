import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productCreateSchema } from "@/lib/validators/inventory";
import { getAllProducts, createProduct } from "@/services/products";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const products = await getAllProducts(db);
  return Response.json(products);
}

export async function POST(request: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const product = await createProduct(db, parsed.data);
  return Response.json(product, { status: 201 });
}
