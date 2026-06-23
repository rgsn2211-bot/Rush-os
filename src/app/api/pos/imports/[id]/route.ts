import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPosImport, listPosSalesRows, getImportSummary } from "@/repositories/pos-imports";
import { voidImport } from "@/services/pos-import";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;
  const posImport = await getPosImport(db, id);
  if (!posImport) {
    return Response.json({ error: "Import not found" }, { status: 404 });
  }

  const [salesRows, summary] = await Promise.all([
    listPosSalesRows(db, id),
    getImportSummary(db, id),
  ]);

  return Response.json({ import: posImport, salesRows, summary });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient();
  await requireOwner(db);

  const { id } = await params;

  try {
    await voidImport(db, id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to void";
    return Response.json({ error: message }, { status: 400 });
  }
}
