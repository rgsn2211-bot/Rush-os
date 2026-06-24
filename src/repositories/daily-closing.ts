import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyClosing,
  DailyClosingWithSubmitter,
} from "@/types/closing";

export interface InsertDailyClosingInput {
  reportDate: string;
  totalOrders: number;
  discountFils: number;
  cashSalesFils: number;
  cardSalesFils: number;
  benefitpaySalesFils: number;
  deliverySalesFils: number;
  grossSalesFils: number;
  cashCountedFils: number;
  cashExpectedFils: number;
  cashVarianceFils: number;
  notes?: string;
  createdBy: string;
}

export async function insertDailyClosing(
  db: SupabaseClient,
  input: InsertDailyClosingInput,
): Promise<DailyClosing> {
  const { data, error } = await db
    .from("daily_closings")
    .insert({
      report_date: input.reportDate,
      total_orders: input.totalOrders,
      discount_fils: input.discountFils,
      cash_sales_fils: input.cashSalesFils,
      card_sales_fils: input.cardSalesFils,
      benefitpay_sales_fils: input.benefitpaySalesFils,
      delivery_sales_fils: input.deliverySalesFils,
      gross_sales_fils: input.grossSalesFils,
      cash_counted_fils: input.cashCountedFils,
      cash_expected_fils: input.cashExpectedFils,
      cash_variance_fils: input.cashVarianceFils,
      notes: input.notes ?? null,
      created_by: input.createdBy,
      status: "needs_review",
    })
    .select("*")
    .single();

  if (error) throw error;
  return toDailyClosing(data);
}

export async function listDailyClosings(
  db: SupabaseClient,
): Promise<DailyClosingWithSubmitter[]> {
  const { data, error } = await db
    .from("daily_closings")
    .select("*")
    .neq("status", "voided")
    .order("report_date", { ascending: false });

  if (error) throw error;
  return withSubmitterNames(db, data.map(toDailyClosing));
}

export async function listPendingDailyClosings(
  db: SupabaseClient,
): Promise<DailyClosingWithSubmitter[]> {
  const { data, error } = await db
    .from("daily_closings")
    .select("*")
    .eq("status", "needs_review")
    .order("report_date", { ascending: false });

  if (error) throw error;
  return withSubmitterNames(db, data.map(toDailyClosing));
}

/** The non-voided closing for a date, if one exists. */
export async function getDailyClosingByDate(
  db: SupabaseClient,
  reportDate: string,
): Promise<DailyClosing | null> {
  const { data, error } = await db
    .from("daily_closings")
    .select("*")
    .eq("report_date", reportDate)
    .neq("status", "voided")
    .maybeSingle();

  if (error) throw error;
  return data ? toDailyClosing(data) : null;
}

export async function getDailyClosing(
  db: SupabaseClient,
  id: string,
): Promise<DailyClosing | null> {
  const { data, error } = await db
    .from("daily_closings")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return toDailyClosing(data);
}

export async function updateDailyClosingStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  reviewedBy: string,
): Promise<void> {
  const { error } = await db
    .from("daily_closings")
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDailyClosing(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("daily_closings").delete().eq("id", id);
  if (error) throw error;
}

async function withSubmitterNames(
  db: SupabaseClient,
  rows: DailyClosing[],
): Promise<DailyClosingWithSubmitter[]> {
  const creatorIds = [
    ...new Set(rows.map((r) => r.createdBy).filter(Boolean)),
  ] as string[];

  const nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    if (profiles) {
      for (const p of profiles) nameMap.set(p.id, p.display_name);
    }
  }

  return rows.map((r) => ({
    ...r,
    submitterName: (r.createdBy && nameMap.get(r.createdBy)) ?? null,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDailyClosing(row: any): DailyClosing {
  return {
    id: row.id,
    reportDate: row.report_date,
    totalOrders: Number(row.total_orders),
    discountFils: Number(row.discount_fils),
    cashSalesFils: Number(row.cash_sales_fils),
    cardSalesFils: Number(row.card_sales_fils),
    benefitpaySalesFils: Number(row.benefitpay_sales_fils),
    deliverySalesFils: Number(row.delivery_sales_fils),
    grossSalesFils: Number(row.gross_sales_fils),
    cashCountedFils: Number(row.cash_counted_fils),
    cashExpectedFils: Number(row.cash_expected_fils),
    cashVarianceFils: Number(row.cash_variance_fils),
    notes: row.notes,
    status: row.status,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
