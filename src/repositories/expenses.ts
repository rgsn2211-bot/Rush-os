import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, ExpenseLine, ExpenseWithLines } from "@/types/money";

export interface InsertExpenseInput {
  spentOn: string;
  method: string;
  account: "register" | "bank";
  note?: string;
  totalFils: number;
  createdBy: string;
  lines: { category: string; amountFils: number; description?: string }[];
}

export async function insertExpense(
  db: SupabaseClient,
  input: InsertExpenseInput,
): Promise<ExpenseWithLines> {
  const { data: expense, error } = await db
    .from("expenses")
    .insert({
      spent_on: input.spentOn,
      method: input.method,
      account: input.account,
      note: input.note ?? null,
      total_fils: input.totalFils,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { data: lines, error: lineErr } = await db
    .from("expense_lines")
    .insert(
      input.lines.map((l) => ({
        expense_id: expense.id,
        category: l.category,
        amount_fils: l.amountFils,
        description: l.description ?? null,
      })),
    )
    .select("*");

  if (lineErr) throw lineErr;

  return { ...toExpense(expense), lines: lines.map(toExpenseLine) };
}

export async function listExpenses(
  db: SupabaseClient,
): Promise<ExpenseWithLines[]> {
  const { data: expenses, error } = await db
    .from("expenses")
    .select("*")
    .order("spent_on", { ascending: false });

  if (error) throw error;
  if (expenses.length === 0) return [];

  const ids = expenses.map((e) => e.id);
  const { data: lines, error: lineErr } = await db
    .from("expense_lines")
    .select("*")
    .in("expense_id", ids);

  if (lineErr) throw lineErr;

  const byExpense = new Map<string, ExpenseLine[]>();
  for (const l of lines) {
    const line = toExpenseLine(l);
    const arr = byExpense.get(line.expenseId) ?? [];
    arr.push(line);
    byExpense.set(line.expenseId, arr);
  }

  return expenses.map((e) => ({
    ...toExpense(e),
    lines: byExpense.get(e.id) ?? [],
  }));
}

export async function deleteExpense(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

/** Sum of expense totals within [from, to) (ISO date strings). */
export async function sumExpensesBetween(
  db: SupabaseClient,
  fromInclusive: string,
  toExclusive: string,
): Promise<number> {
  const { data, error } = await db
    .from("expenses")
    .select("total_fils")
    .gte("spent_on", fromInclusive)
    .lt("spent_on", toExclusive);

  if (error) throw error;
  return data.reduce((sum, r) => sum + Number(r.total_fils), 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toExpense(row: any): Expense {
  return {
    id: row.id,
    spentOn: row.spent_on,
    method: row.method,
    account: row.account ?? "register",
    note: row.note,
    receiptPath: row.receipt_path,
    totalFils: Number(row.total_fils),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toExpenseLine(row: any): ExpenseLine {
  return {
    id: row.id,
    expenseId: row.expense_id,
    category: row.category,
    amountFils: Number(row.amount_fils),
    description: row.description,
    createdAt: row.created_at,
  };
}
