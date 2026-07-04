import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth";
import { workerInventoryItemCreateSchema } from "@/lib/validators/inventory";
import { editWorkerItem, removeWorkerItem } from "@/services/inventory";

// Worker edits/voids run on the admin client so they can touch any (approved) row.
// This is safe: the route is worker-gated and the service only ever writes non-cost
// columns — cost stays owner-only, and no broad worker RLS write policy exists.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = workerInventoryItemCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await editWorkerItem(createAdminClient(), id, parsed.data);
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

  const { id } = await params;
  await removeWorkerItem(createAdminClient(), id);
  return new Response(null, { status: 204 });
}
