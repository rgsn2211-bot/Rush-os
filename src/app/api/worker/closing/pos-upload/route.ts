import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth";
import { uploadSalesImport } from "@/services/pos-import";

/**
 * Lets a worker upload the day's Sales By Item XLSX from inside the closing
 * wizard. POS tables are owner-only, so the worker is authenticated here and the
 * import runs via the service-role client (server-side, bypassing RLS). Only a
 * non-financial summary (counts + status) is returned — no revenue amounts.
 */
export async function POST(request: NextRequest) {
  const db = await createClient();
  const authUser = await getAuthUser(db);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "worker") {
    return Response.json({ error: "Workers only" }, { status: 403 });
  }

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
  const admin = createAdminClient();

  try {
    const result = await uploadSalesImport(
      admin,
      buffer,
      file.name,
      authUser.id,
      expectedDate ?? undefined,
    );
    // Return counts only — never revenue figures — to the worker.
    return Response.json(
      {
        status: result.import.status,
        reportDate: result.import.reportDate,
        rowCount: result.import.rowCount ?? 0,
        mappedCount: result.summary.mappedCount,
        unmappedCount: result.summary.unmappedCount,
        needsReviewCount: result.summary.needsReviewCount,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
