import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRoleApi } from "@/lib/auth";
import { uploadSalesImport } from "@/services/pos-import";
import { listPosImports } from "@/repositories/pos-imports";

export async function GET() {
  const db = await createClient();
  const auth = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (auth instanceof Response) return auth;

  const imports = await listPosImports(db);
  return Response.json(imports);
}

export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await requireRoleApi(db, ["owner", "pos_manager"]);
  if (authUser instanceof Response) return authUser;

  const expectedDate = request.nextUrl.searchParams.get("expectedDate");

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.endsWith(".xlsx")) {
    return Response.json(
      { error: "Only .xlsx files are accepted" },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();

  try {
    const result = await uploadSalesImport(
      db,
      buffer,
      file.name,
      authUser.id,
      expectedDate ?? undefined,
    );
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
