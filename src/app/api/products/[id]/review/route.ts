import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { productReviewSchema } from "@/lib/validators/inventory";
import { approveProduct, rejectProduct } from "@/services/products";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "owner") {
    return Response.json({ error: "Owners only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = productReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const product =
      parsed.data.action === "approve"
        ? await approveProduct(db, id, authUser.id)
        : await rejectProduct(db, id, authUser.id);
    return Response.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to review";
    return Response.json({ error: message }, { status: 400 });
  }
}
