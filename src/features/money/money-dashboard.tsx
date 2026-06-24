"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MoneySummary,
  ExpenseWithLines,
  CashMovement,
  Settlement,
  CashFlowProjection,
  RecurringCost,
} from "@/types/money";
import type { PurchaseRow } from "@/features/money/types";
import { formatFils } from "@/lib/calculations/currency";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseForm } from "@/features/money/expense-form";
import { CashMovementForm } from "@/features/money/cash-movement-form";
import { SettlementForm } from "@/features/money/settlement-form";
import { CashFlowView } from "@/features/money/cash-flow-view";
import { RecurringForm } from "@/features/money/recurring-form";
import { UpcomingView } from "@/features/money/upcoming-view";
import {
  Receipt,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
} from "lucide-react";

interface Props {
  summary: MoneySummary;
  expenses: ExpenseWithLines[];
  cashMovements: CashMovement[];
  purchases: PurchaseRow[];
  settlements: Settlement[];
  projection: CashFlowProjection;
  recurringCosts: RecurringCost[];
}

type Tab = "overview" | "cashflow" | "moneyout" | "cashlog" | "upcoming";
type MoneyOutSub = "purchases" | "expenses" | "payables";
type FormKind = "expense" | "movement" | "settlement" | "recurring" | null;

const TABS: { v: Tab; label: string }[] = [
  { v: "overview", label: "Overview" },
  { v: "cashflow", label: "Cash Flow" },
  { v: "moneyout", label: "Money Out" },
  { v: "cashlog", label: "Cash Log" },
  { v: "upcoming", label: "Upcoming Costs" },
];

export function MoneyDashboard({
  summary,
  expenses,
  cashMovements,
  purchases,
  settlements,
  projection,
  recurringCosts,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [form, setForm] = useState<FormKind>(null);

  if (form === "expense") return <ExpenseForm onDone={() => setForm(null)} />;
  if (form === "movement")
    return <CashMovementForm onDone={() => setForm(null)} />;
  if (form === "settlement")
    return <SettlementForm onDone={() => setForm(null)} />;
  if (form === "recurring")
    return <RecurringForm onDone={() => setForm(null)} />;

  return (
    <div>
      <PageHeader title="Money" subtitle="Cash, costs & payables" />

      {/* Tab bar */}
      <div className="border-line mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.v
                ? "border-navy text-navy"
                : "text-ink-3 hover:text-ink border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Overview summary={summary} onForm={setForm} onTab={setTab} />
      )}
      {tab === "cashflow" && (
        <CashFlowView
          settlements={settlements}
          projection={projection}
          onNew={() => setForm("settlement")}
        />
      )}
      {tab === "moneyout" && (
        <MoneyOut
          purchases={purchases}
          expenses={expenses}
          payables={purchases.filter((p) => !p.isPaid)}
          onNewExpense={() => setForm("expense")}
          onRefresh={() => router.refresh()}
        />
      )}
      {tab === "cashlog" && (
        <CashLog
          movements={cashMovements}
          onNew={() => setForm("movement")}
          onRefresh={() => router.refresh()}
        />
      )}
      {tab === "upcoming" && (
        <UpcomingView
          costs={recurringCosts}
          onNew={() => setForm("recurring")}
        />
      )}
    </div>
  );
}

function Overview({
  summary,
  onForm,
  onTab,
}: {
  summary: MoneySummary;
  onForm: (f: FormKind) => void;
  onTab: (t: Tab) => void;
}) {
  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <MetricCard
          label="Cash position"
          value={`${formatFils(summary.cashPositionFils)} BHD`}
          accent="var(--color-navy)"
        />
        <MetricCard
          label="Unpaid / payables"
          value={`${formatFils(summary.payablesFils)} BHD`}
          accent="var(--color-rush-red)"
        />
        <MetricCard
          label="Expenses (month)"
          value={`${formatFils(summary.expensesMonthFils)} BHD`}
        />
        <MetricCard
          label="Inventory purchases (month)"
          value={`${formatFils(summary.inventoryPurchasesMonthFils)} BHD`}
        />
      </div>

      <Card>
        <CardContent>
          <div className="text-ink mb-3 text-[15px] font-bold">
            Quick Actions
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ActionButton
              icon={<Receipt size={19} />}
              label="Log Expense"
              onClick={() => onForm("expense")}
            />
            <ActionButton
              icon={<Banknote size={19} />}
              label="Cash Movement"
              onClick={() => onForm("movement")}
            />
            <ActionButton
              icon={<ArrowUpRight size={19} />}
              label="View Payables"
              onClick={() => onTab("moneyout")}
            />
          </div>
          <p className="text-ink-3 mt-4 text-xs leading-relaxed">
            Cash position is the running net of the Cash Log (money in − money
            out). Record daily cash deposits, owner injections and withdrawals
            there to keep it accurate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="border-line hover:border-ink-3 hover:bg-bg flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 text-left transition-colors"
    >
      <span className="text-navy">{icon}</span>
      <span className="text-ink text-sm font-semibold">{label}</span>
    </button>
  );
}

const MONEYOUT_SUBS: { v: MoneyOutSub; label: string }[] = [
  { v: "purchases", label: "Inventory Purchases" },
  { v: "expenses", label: "Expenses" },
  { v: "payables", label: "Payables" },
];

function MoneyOut({
  purchases,
  expenses,
  payables,
  onNewExpense,
  onRefresh,
}: {
  purchases: PurchaseRow[];
  expenses: ExpenseWithLines[];
  payables: PurchaseRow[];
  onNewExpense: () => void;
  onRefresh: () => void;
}) {
  const [sub, setSub] = useState<MoneyOutSub>("purchases");
  const [payingId, setPayingId] = useState<string | null>(null);

  async function pay(id: string) {
    setPayingId(id);
    await fetch(`/api/money/purchases/${id}/pay`, { method: "POST" });
    setPayingId(null);
    onRefresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="bg-bg inline-flex rounded-xl p-1">
          {MONEYOUT_SUBS.map((s) => (
            <button
              key={s.v}
              onClick={() => setSub(s.v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                sub === s.v ? "text-navy bg-card shadow-sm" : "text-ink-3"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {sub === "expenses" && (
          <Button size="sm" onClick={onNewExpense}>
            <Plus size={15} className="mr-1" />
            New Expense
          </Button>
        )}
      </div>

      {sub === "purchases" && (
        <PurchaseTable rows={purchases} onPay={pay} payingId={payingId} />
      )}
      {sub === "payables" && (
        <PurchaseTable
          rows={payables}
          onPay={pay}
          payingId={payingId}
          emptyMessage="No outstanding payables — everything is paid."
        />
      )}
      {sub === "expenses" && <ExpenseListView expenses={expenses} />}
    </div>
  );
}

function PurchaseTable({
  rows,
  onPay,
  payingId,
  emptyMessage = "No purchases yet.",
}: {
  rows: PurchaseRow[];
  onPay: (id: string) => void;
  payingId: string | null;
  emptyMessage?: string;
}) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <Card className="p-0">
      {rows.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-4 px-5 py-4 ${
            i > 0 ? "border-line-2 border-t" : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold">{p.supplierName}</div>
            <div className="text-ink-3 text-[13px]">{p.purchasedOn}</div>
          </div>
          {p.isPaid ? (
            <Badge variant="green">Paid</Badge>
          ) : (
            <Badge variant="amber">
              {p.dueDate ? `Due ${p.dueDate}` : "Unpaid"}
            </Badge>
          )}
          <div className="text-ink w-28 text-right font-mono text-sm font-bold">
            {formatFils(p.totalFils)}
          </div>
          {!p.isPaid && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onPay(p.id)}
              disabled={payingId === p.id}
            >
              Pay
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}

function ExpenseListView({ expenses }: { expenses: ExpenseWithLines[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string) {
    setDeletingId(id);
    await fetch(`/api/money/expenses/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  if (expenses.length === 0)
    return <EmptyState message="No expenses logged yet." />;

  return (
    <div className="flex flex-col gap-3">
      {expenses.map((e) => (
        <Card key={e.id} className="p-0">
          <div className="border-line-2 flex items-center justify-between border-b px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-ink-2 font-mono text-[13px]">
                {e.spentOn}
              </span>
              {e.note && (
                <span className="text-ink text-sm font-semibold">{e.note}</span>
              )}
              <Badge variant="default">{e.method}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ink font-mono text-sm font-bold">
                {formatFils(e.totalFils)} BHD
              </span>
              <button
                onClick={() => remove(e.id)}
                disabled={deletingId === e.id}
                className="text-ink-3 hover:text-rush-red"
                aria-label="Delete expense"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="px-5 py-2">
            {e.lines.map((l, i) => (
              <div
                key={l.id}
                className={`flex items-center justify-between py-2 ${
                  i > 0 ? "border-line-2 border-t" : ""
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Badge variant="default">{l.category}</Badge>
                  {l.description && (
                    <span className="text-ink-3 text-[13px]">
                      {l.description}
                    </span>
                  )}
                </span>
                <span className="text-ink font-mono text-[13px] font-semibold">
                  {formatFils(l.amountFils)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function CashLog({
  movements,
  onNew,
  onRefresh,
}: {
  movements: CashMovement[];
  onNew: () => void;
  onRefresh: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string) {
    setDeletingId(id);
    await fetch(`/api/money/cash-movements/${id}`, { method: "DELETE" });
    setDeletingId(null);
    onRefresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-ink-3 text-sm">
          Manual money in/out — the source of truth for cash position.
        </p>
        <Button size="sm" onClick={onNew}>
          <Plus size={15} className="mr-1" />
          Add Movement
        </Button>
      </div>

      {movements.length === 0 ? (
        <EmptyState message="No cash movements recorded yet." />
      ) : (
        <Card className="p-0">
          {movements.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i > 0 ? "border-line-2 border-t" : ""
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  m.direction === "in" ? "bg-rush-green-bg" : "bg-rush-red-bg"
                }`}
              >
                {m.direction === "in" ? (
                  <ArrowDownLeft size={16} className="text-rush-green" />
                ) : (
                  <ArrowUpRight size={16} className="text-rush-red" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold">{m.reason}</div>
                <div className="text-ink-3 text-[12.5px]">
                  {m.occurredOn} · {m.method}
                  {m.affectsPl && " · affects P&L"}
                </div>
              </div>
              {m.affectsPl ? (
                <Badge variant="amber">P&amp;L</Badge>
              ) : (
                <span className="text-ink-3 text-xs">Cash only</span>
              )}
              <div
                className={`w-28 text-right font-mono text-sm font-bold ${
                  m.direction === "in" ? "text-rush-green" : "text-ink"
                }`}
              >
                {m.direction === "in" ? "+" : "−"}
                {formatFils(m.amountFils)}
              </div>
              <button
                onClick={() => remove(m.id)}
                disabled={deletingId === m.id}
                className="text-ink-3 hover:text-rush-red"
                aria-label="Delete movement"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
