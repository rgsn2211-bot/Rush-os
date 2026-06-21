/* Rush OS — Owner: Money (dashboard, cash flow + settlements, money out, cash log, upcoming) + forms. */
const { useState: useStateM } = React;
const DM = window.RushData;

function OwnerMoney({ mobile }) {
  const [tab, setTab] = useState("dashboard");
  const [form, setForm] = useState(null); // 'purchase' | 'expense' | 'recurring' | 'movement'
  const [payModal, setPayModal] = useState(null);

  if (form === "purchase") return <PurchaseForm onBack={() => setForm(null)} mobile={mobile} />;
  if (form === "expense") return <ExpenseForm onBack={() => setForm(null)} mobile={mobile} />;
  if (form === "recurring") return <RecurringForm onBack={() => setForm(null)} mobile={mobile} />;
  if (form === "movement") return <MovementForm onBack={() => setForm(null)} mobile={mobile} />;

  const ms = DM.moneySummary;
  const tabs = [
    { v: "dashboard", label: "Overview" },
    { v: "cashflow", label: "Cash Flow" },
    { v: "moneyout", label: "Money Out" },
    { v: "cashlog", label: "Cash Log" },
    { v: "upcoming", label: "Upcoming Costs" },
  ];

  return (
    <div>
      <PageHead title="Money" sub="Cash, settlements, costs & payables" />
      <div style={{ marginBottom: 22, overflowX: "auto" }}><SegTabs tabs={tabs} value={tab} onChange={setTab} /></div>

      {tab === "dashboard" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 22 }}>
            <Metric label="Cash position" value={money(ms.cashPosition)} accent={RUSH.navy} caption="live" />
            <Metric label="Pending settlements" value={money(ms.pendingSettlements)} accent={RUSH.green} caption="expected in" />
            <Metric label="Unpaid / payables" value={money(ms.payables)} accent={RUSH.red} caption="due soon" />
            <Metric label="Expenses (month)" value={money(ms.expensesMonth)} />
            <Metric label="Inventory purchases (month)" value={money(ms.inventoryPurchasesMonth)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <Card pad={20}>
              <SectionTitle right={<Btn kind="ghost" size="sm" onClick={() => setTab("cashflow")}>Open</Btn>}>Projected Cash</SectionTitle>
              <ProjectedRow />
            </Card>
            <Card pad={20}>
              <SectionTitle right={<Btn kind="ghost" size="sm" onClick={() => setTab("moneyout")}>Open</Btn>}>Quick Actions</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["Log Purchase", "receive", "purchase"], ["Log Expense", "receipt", "expense"], ["Add Recurring", "calendar", "recurring"], ["Cash Movement", "cash", "movement"]].map(([l, ic, f]) => (
                  <button key={l} onClick={() => setForm(f)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", border: `1px solid ${RUSH.line}`, borderRadius: 11, background: "#fff", cursor: "pointer", textAlign: "left" }}>
                    <Icon name={ic} size={19} color={RUSH.navy} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>{l}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "cashflow" && <CashFlowView mobile={mobile} onMovement={() => setForm("movement")} onPay={setPayModal} />}
      {tab === "moneyout" && <MoneyOutView mobile={mobile} onNew={setForm} onPay={setPayModal} />}
      {tab === "cashlog" && <CashLogView mobile={mobile} onMovement={() => setForm("movement")} />}
      {tab === "upcoming" && <UpcomingView mobile={mobile} onNew={() => setForm("recurring")} onPay={setPayModal} />}

      {payModal && (
        <Modal title="Mark as paid" sub={payModal.who} onClose={() => setPayModal(null)}
          footer={<><Btn kind="ghost" onClick={() => setPayModal(null)}>Cancel</Btn><Btn kind="primary" icon="check" onClick={() => setPayModal(null)}>Confirm Payment</Btn></>}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${RUSH.line2}`, marginBottom: 16 }}>
            <span style={{ color: RUSH.ink2 }}>Amount</span><Money value={payModal.amount} size={16} weight={700} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Payment method"><Select value="Bank transfer" onChange={() => {}} options={["Cash", "Card", "Bank transfer", "BenefitPay"]} /></Field>
            <Field label="Payment date"><Input mono value="16 Jun 2026" onChange={() => {}} /></Field>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: RUSH.ink3, lineHeight: 1.5 }}>Confirming records the payment, decreases cash, and closes this payable.</div>
        </Modal>
      )}
    </div>
  );
}
window.OwnerMoney = OwnerMoney;

function ProjectedRow() {
  const cf = DM.cashFlow;
  const rows = [["Available cash now", cf.availableNow, RUSH.ink], ["+ Expected incoming", cf.expectedIncoming, RUSH.green], ["− Upcoming outgoing", -cf.upcomingOutgoing, RUSH.red], ["= Projected cash", cf.projected, cf.projected < 0 ? RUSH.red : RUSH.green]];
  return (
    <div>
      {rows.map(([l, v, c], i) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none", borderTopWidth: i === 3 ? 1.5 : 1 }}>
          <span style={{ fontSize: 13.5, fontWeight: i === 3 ? 700 : 500, color: i === 3 ? RUSH.ink : RUSH.ink2 }}>{l}</span>
          <span style={{ fontFamily: RUSH.mono, fontSize: i === 3 ? 16 : 14, fontWeight: i === 3 ? 700 : 600, color: c }}>{(v < 0 ? "−" : "") + money(Math.abs(v))}</span>
        </div>
      ))}
      <div style={{ marginTop: 12, fontSize: 12, color: RUSH.ink3 }}>Cash flow follows money received/paid dates — not sales dates.</div>
    </div>
  );
}

function CashFlowView({ mobile, onMovement, onPay }) {
  const [stab, setStab] = useState("Card");
  const stabs = ["Card", "BenefitPay", "Delivery Apps"];
  const data = { Card: DM.settlements.card, BenefitPay: DM.settlements.benefitpay, "Delivery Apps": DM.settlements.delivery }[stab];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card pad={20}><SectionTitle>Projected Cash Position</SectionTitle><ProjectedRow /></Card>
        <Card pad={20}>
          <SectionTitle sub="Cash in/out you record manually" right={<Btn kind="secondary" size="sm" icon="plus" onClick={onMovement}>Add</Btn>}>Manual Movements</SectionTitle>
          {DM.cashLog.slice(0, 4).map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: c.type === "Money In" ? RUSH.greenBg : RUSH.redBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={c.type === "Money In" ? "arrowDown" : "arrowUp"} size={15} color={c.type === "Money In" ? RUSH.green : RUSH.red} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label}</div><div style={{ fontSize: 11.5, color: RUSH.ink3 }}>{c.date} · {c.method}{c.pl ? " · affects P&L" : ""}</div></div>
              <span style={{ fontFamily: RUSH.mono, fontWeight: 600, fontSize: 13.5, color: c.type === "Money In" ? RUSH.green : RUSH.ink }}>{c.type === "Money In" ? "+" : "−"}{money(c.amount)}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* pending settlements */}
      <SectionTitle sub="Money owed to you by payment providers — not yet in the bank">Pending Settlements</SectionTitle>
      <div style={{ marginBottom: 14 }}><SegTabs tabs={stabs} value={stab} onChange={setStab} size="sm" /></div>
      <Card pad={0}>
        <Table
          cols={[
            ...(stab === "Delivery Apps" ? [{ h: "Platform", cell: (r) => <span style={{ fontWeight: 600 }}>{r.platform}</span> }] : []),
            { h: "Period", cell: (r) => <span style={{ fontWeight: stab === "Delivery Apps" ? 400 : 600 }}>{r.period}</span> },
            { h: "Expected", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{money(r.expected)}</span> },
            { h: stab === "BenefitPay" ? "Fee" : "Fee/deduction", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink3 }}>{r.fee == null ? "—" : money(r.fee)}</span> },
            { h: "Actual received", align: "right", cell: (r) => r.actual == null ? <span style={{ color: RUSH.ink3 }}>—</span> : <span style={{ fontFamily: RUSH.mono, fontWeight: 600, color: RUSH.green }}>{money(r.actual)}</span> },
            { h: "Received", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.received}</span> },
            { h: "Status", cell: (r) => <Pill kind={r.status === "Received" ? "ok" : "warning"}>{r.status}</Pill> },
            { h: "", cell: (r) => r.status === "Pending" ? <Btn kind="secondary" size="sm" onClick={(e) => { e.stopPropagation?.(); onPay({ who: (r.platform || stab) + " settlement", amount: r.expected }); }}>Confirm</Btn> : <Icon name="check" size={16} color={RUSH.green} /> },
          ]}
          rows={data} />
      </Card>
      <div style={{ marginTop: 12, fontSize: 12.5, color: RUSH.ink3, lineHeight: 1.5 }}>
        {stab === "BenefitPay" && "BenefitPay goes directly to the bank with no fee — confirm received if you want to reconcile."}
        {stab === "Card" && "Card settles with a short delay and a processing fee deducted before payout."}
        {stab === "Delivery Apps" && "Delivery apps settle monthly. Commission and fixed fees are deducted before payout — configure them in Delivery → Settings."}
      </div>
    </div>
  );
}

function MoneyOutView({ mobile, onNew, onPay }) {
  const [sub, setSub] = useState("purchases");
  const subs = [{ v: "purchases", label: "Inventory Purchases" }, { v: "expenses", label: "Normal Expenses" }, { v: "recurring", label: "Recurring / Upcoming" }, { v: "payables", label: "Payables" }];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <SegTabs tabs={subs} value={sub} onChange={setSub} size="sm" />
        <Btn kind="primary" size="sm" icon="plus" onClick={() => onNew(sub === "purchases" ? "purchase" : sub === "expenses" ? "expense" : "recurring")} style={sub === "payables" ? { display: "none" } : {}}>
          {sub === "purchases" ? "New Purchase" : sub === "expenses" ? "New Expense" : "New Recurring"}
        </Btn>
      </div>

      {sub === "purchases" && (
        <div>
          <div style={{ marginBottom: 14, display: "flex", gap: 10, padding: 13, background: RUSH.blueBg, borderRadius: 11, alignItems: "flex-start" }}>
            <Icon name="alert" size={18} color={RUSH.blue} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>Purchases increase inventory when received, hit cash flow when paid, and become COGS only when items are sold or wasted. Unpaid purchases show up in payables.</div>
          </div>
          <Card pad={0}>
            <Table
              cols={[
                { h: "Supplier", cell: (r) => <span style={{ fontWeight: 600 }}>{r.supplier}</span> },
                { h: "Date", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.date}</span> },
                { h: "Items", align: "right", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.items.length}</span> },
                { h: "Total", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 700 }}>{money(r.total)}</span> },
                { h: "Payment", cell: (r) => <Pill kind={r.status === "Paid" ? "ok" : "warning"}>{r.status}{r.status === "Paid" ? ` · ${r.method}` : ` · due ${r.due}`}</Pill> },
                { h: "Receipt", align: "center", cell: (r) => r.receipt ? <Icon name="receipt" size={16} color={RUSH.navy} /> : <ReviewChip>No receipt</ReviewChip> },
                { h: "", cell: (r) => r.status === "Unpaid" ? <Btn kind="secondary" size="sm" onClick={(e) => { e.stopPropagation?.(); onPay({ who: r.supplier, amount: r.total }); }}>Pay</Btn> : null },
              ]}
              rows={DM.purchases} />
          </Card>
        </div>
      )}

      {sub === "expenses" && (
        <div>
          <div style={{ marginBottom: 14, display: "flex", gap: 10, padding: 13, background: RUSH.blueBg, borderRadius: 11, alignItems: "flex-start" }}>
            <Icon name="alert" size={18} color={RUSH.blue} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>Normal expenses hit both cash flow and the P&L. One receipt can be split across multiple categories.</div>
          </div>
          {DM.normalExpenses.map((e) => (
            <Card key={e.id} pad={0} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${RUSH.line2}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontFamily: RUSH.mono, color: RUSH.ink2, fontSize: 13 }}>{e.date}</span><span style={{ fontWeight: 600 }}>{e.note}</span>{e.receipt && <Icon name="receipt" size={15} color={RUSH.navy} />}<Badge color={RUSH.ink2} bg={RUSH.bg}>{e.method}</Badge></div>
                <span style={{ fontFamily: RUSH.mono, fontWeight: 700 }}>{money(e.total)} <span style={{ fontSize: 11, color: RUSH.ink3 }}>BHD</span></span>
              </div>
              <div style={{ padding: "6px 18px 12px" }}>
                {e.lines.map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Badge color={RUSH.ink2} bg={RUSH.bg}>{l.cat}</Badge><span style={{ fontSize: 13, color: RUSH.ink3 }}>{l.desc}</span></span>
                    <span style={{ fontFamily: RUSH.mono, fontSize: 13.5, fontWeight: 600 }}>{money(l.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {sub === "recurring" && <UpcomingTable onPay={onPay} />}
      {sub === "payables" && <div style={{ marginTop: -8 }}><SupplierPayablesInline onPay={onPay} /></div>}
    </div>
  );
}

function UpcomingTable({ onPay }) {
  return (
    <Card pad={0}>
      <Table
        cols={[
          { h: "Cost", cell: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
          { h: "Type", cell: (r) => <Badge color={RUSH.ink2} bg={RUSH.bg}>{r.type}</Badge> },
          { h: "Frequency", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.every}</span> },
          { h: "Due", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.due}</span> },
          { h: "Amount", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 700 }}>{money(r.amount)}</span> },
          { h: "", cell: (r) => <Btn kind="secondary" size="sm" onClick={(e) => { e.stopPropagation?.(); onPay({ who: r.name, amount: r.amount }); }}>Mark Paid</Btn> },
        ]}
        rows={DM.upcoming} />
    </Card>
  );
}

function UpcomingView({ mobile, onNew, onPay }) {
  const total = DM.upcoming.reduce((s, u) => s + u.amount, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Card pad={16} style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          <div><div style={{ fontSize: 12.5, color: RUSH.ink3, fontWeight: 600 }}>Total upcoming (30 days)</div><div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, marginTop: 3 }}>{money(total)} <span style={{ fontSize: 12, color: RUSH.ink3 }}>BHD</span></div></div>
        </Card>
        <Btn kind="primary" icon="plus" onClick={onNew}>Add Recurring Cost</Btn>
      </div>
      <UpcomingTable onPay={onPay} />
      <div style={{ marginTop: 12, fontSize: 12.5, color: RUSH.ink3 }}>Recurring/upcoming costs are for planning. They become an expense/payment only when you mark them paid.</div>
    </div>
  );
}

function CashLogView({ mobile, onMovement }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: RUSH.ink3 }}>Manual money in/out and register cash events</div>
        <Btn kind="primary" size="sm" icon="plus" onClick={onMovement}>Add Movement</Btn>
      </div>
      <Card pad={0}>
        <Table
          cols={[
            { h: "Date", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.date}</span> },
            { h: "Type", cell: (r) => <Pill kind={r.type === "Money In" ? "ok" : "low"}>{r.type}</Pill> },
            { h: "Description", cell: (r) => <span style={{ fontWeight: 600 }}>{r.label}</span> },
            { h: "Method", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.method}</span> },
            { h: "P&L", align: "center", cell: (r) => r.pl ? <Badge color={RUSH.amber} bg={RUSH.amberBg}>Affects P&L</Badge> : <span style={{ color: RUSH.ink3, fontSize: 12 }}>Cash only</span> },
            { h: "Amount", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 700, color: r.type === "Money In" ? RUSH.green : RUSH.ink }}>{r.type === "Money In" ? "+" : "−"}{money(r.amount)}</span> },
          ]}
          rows={DM.cashLog} />
      </Card>
    </div>
  );
}

/* ---------- Money forms (push screens) ---------- */
function FormShell({ title, sub, onBack, children, cta, mobile, side }) {
  return (
    <div>
      <BackLink onClick={onBack}>Back to Money</BackLink>
      <PageHead title={title} sub={sub} />
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : side ? "1.6fr 1fr" : "1fr", gap: 20, alignItems: "start", maxWidth: side ? "none" : 720 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
        {side && <Card pad={20} style={{ position: mobile ? "static" : "sticky", top: 84 }}>{side}<Btn kind="primary" full size="lg" icon="check" style={{ marginTop: 16 }} onClick={onBack}>{cta}</Btn><Btn kind="ghost" full style={{ marginTop: 8 }} onClick={onBack}>Cancel</Btn></Card>}
      </div>
      {!side && <div style={{ display: "flex", gap: 10, marginTop: 18, maxWidth: 720 }}><Btn kind="primary" size="lg" icon="check" onClick={onBack} style={{ flex: 1 }}>{cta}</Btn><Btn kind="ghost" size="lg" onClick={onBack}>Cancel</Btn></div>}
    </div>
  );
}

function PurchaseLineEditor({ mobile }) {
  const [lines, setLines] = useState([{ id: 1 }, { id: 2 }]);
  return (
    <Card pad={0}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${RUSH.line2}`, fontSize: 15, fontWeight: 700 }}>Items</div>
      <div style={{ padding: 16 }}>
        {lines.map((l, i) => (
          <div key={l.id} style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "2fr 1fr 1fr 1.2fr 1fr auto", gap: 10, alignItems: "end", padding: "10px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
            <Field label={i === 0 ? "Item" : ""}><Select value={DM.inventory[i]?.name || DM.inventory[0].name} onChange={() => {}} options={DM.inventory.map((x) => x.name)} /></Field>
            <Field label={i === 0 ? "Qty" : ""}><Input mono value="" placeholder="0" onChange={() => {}} /></Field>
            <Field label={i === 0 ? "Unit" : ""}><Select value="case" onChange={() => {}} options={["case", "kg", "box", "tray", "tin", "pack", "btl"]} /></Field>
            <Field label={i === 0 ? "Unit cost" : ""}><Input mono value="" placeholder="0.000" onChange={() => {}} /></Field>
            <Field label={i === 0 ? "Expiry" : ""}><Input value="" placeholder="—" onChange={() => {}} /></Field>
            <button onClick={() => setLines(lines.length > 1 ? lines.filter((x) => x.id !== l.id) : lines)} style={{ height: 42, width: 42, border: `1px solid ${RUSH.line}`, borderRadius: 10, background: "#fff", cursor: "pointer", color: RUSH.ink3, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={16} /></button>
          </div>
        ))}
        <Btn kind="secondary" full icon="plus" style={{ borderStyle: "dashed", marginTop: 12 }} onClick={() => setLines([...lines, { id: Date.now() }])}>Add item line</Btn>
      </div>
    </Card>
  );
}

function PurchaseForm({ onBack, mobile }) {
  const [status, setStatus] = useState("Unpaid");
  return (
    <FormShell title="New Inventory Purchase" sub="Invoice-style — supplier header + item lines" onBack={onBack} cta="Save Purchase" mobile={mobile}>
      <Card pad={20}>
        <SectionTitle>Purchase header</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Supplier"><Select value={DM.suppliers[0]} onChange={() => {}} options={DM.suppliers} /></Field>
          <Field label="Purchase date"><Input mono value="14 Jun 2026" onChange={() => {}} /></Field>
          <Field label="Payment status"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={["Paid", "Unpaid"]} /></Field>
          {status === "Paid" ? <Field label="Payment method"><Select value="Card" onChange={() => {}} options={["Cash", "Card", "Bank transfer", "BenefitPay"]} /></Field>
            : <Field label="Due date"><Input mono value="20 Jun 2026" onChange={() => {}} /></Field>}
          <Field label="Receipt / invoice"><Input value="" placeholder="Attach photo" onChange={() => {}} /></Field>
          <Field label="Notes"><Input value="" placeholder="optional" onChange={() => {}} /></Field>
        </div>
        {status === "Unpaid" && <div style={{ marginTop: 14, display: "flex", gap: 10, padding: 12, background: RUSH.amberBg, borderRadius: 10, alignItems: "center" }}><Icon name="alert" size={17} color={RUSH.amber} /><span style={{ fontSize: 13, color: RUSH.ink2 }}>Unpaid → appears in payables &amp; upcoming cash out. Inventory still increases on receipt.</span></div>}
      </Card>
      <PurchaseLineEditor mobile={mobile} />
    </FormShell>
  );
}

function ExpenseForm({ onBack, mobile }) {
  const [lines, setLines] = useState([{ id: 1 }, { id: 2 }]);
  return (
    <FormShell title="New Expense" sub="One receipt can split across categories" onBack={onBack} cta="Save Expense" mobile={mobile}>
      <Card pad={20}>
        <SectionTitle>Receipt</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Date"><Input mono value="14 Jun 2026" onChange={() => {}} /></Field>
          <Field label="Payment method"><Select value="Cash" onChange={() => {}} options={["Cash", "Card", "Bank transfer", "BenefitPay"]} /></Field>
          <Field label="Receipt / photo"><Input value="" placeholder="Attach" onChange={() => {}} /></Field>
        </div>
        <Field label="Notes" style={{ marginTop: 14 }}><Input value="" placeholder="optional" onChange={() => {}} /></Field>
      </Card>
      <Card pad={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${RUSH.line2}`, fontSize: 15, fontWeight: 700 }}>Expense lines</div>
        <div style={{ padding: 16 }}>
          {lines.map((l, i) => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1.2fr 1fr 2fr auto", gap: 10, alignItems: "end", padding: "10px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
              <Field label={i === 0 ? "Category" : ""}><Select value="Cleaning" onChange={() => {}} options={["Utilities", "Maintenance", "Cleaning", "Marketing", "Transport", "Other"]} /></Field>
              <Field label={i === 0 ? "Amount" : ""}><Input mono value="" placeholder="0.000" onChange={() => {}} /></Field>
              <Field label={i === 0 ? "Description" : ""}><Input value="" placeholder="optional" onChange={() => {}} /></Field>
              <button onClick={() => setLines(lines.length > 1 ? lines.filter((x) => x.id !== l.id) : lines)} style={{ height: 42, width: 42, border: `1px solid ${RUSH.line}`, borderRadius: 10, background: "#fff", cursor: "pointer", color: RUSH.ink3, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={16} /></button>
            </div>
          ))}
          <Btn kind="secondary" full icon="plus" style={{ borderStyle: "dashed", marginTop: 12 }} onClick={() => setLines([...lines, { id: Date.now() }])}>Add expense line</Btn>
        </div>
      </Card>
    </FormShell>
  );
}

function RecurringForm({ onBack, mobile }) {
  return (
    <FormShell title="New Recurring / Upcoming Cost" sub="For cash planning — becomes a payment when marked paid" onBack={onBack} cta="Save Cost" mobile={mobile}>
      <Card pad={20}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Field label="Name"><Input value="" placeholder="e.g. Shop Rent" onChange={() => {}} /></Field>
          <Field label="Type"><Select value="Rent" onChange={() => {}} options={["Rent", "Salaries", "Supplier", "Subscription", "Installment", "Other"]} /></Field>
          <Field label="Amount" hint="BHD"><Input mono value="" placeholder="0.000" onChange={() => {}} /></Field>
          <Field label="Frequency"><Select value="Monthly" onChange={() => {}} options={["Monthly", "Weekly", "On invoice", "One-time"]} /></Field>
          <Field label="Next due date"><Input mono value="1 Jul 2026" onChange={() => {}} /></Field>
          <Field label="Default payment method"><Select value="Bank transfer" onChange={() => {}} options={["Cash", "Card", "Bank transfer", "BenefitPay"]} /></Field>
        </div>
      </Card>
    </FormShell>
  );
}

function MovementForm({ onBack, mobile }) {
  const [dir, setDir] = useState("Money In");
  const [pl, setPl] = useState(false);
  const inOpts = ["Owner injection", "Loan received", "Bank transfer in", "Other income"];
  const outOpts = ["Owner withdrawal", "Loan payment", "Bank transfer out", "Other cash movement"];
  return (
    <FormShell title="Manual Cash Movement" sub="Money in/out not tied to sales or purchases" onBack={onBack} cta="Record Movement" mobile={mobile}>
      <Card pad={20}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {["Money In", "Money Out"].map((d) => (
            <button key={d} onClick={() => setDir(d)} style={{ flex: 1, padding: "13px", borderRadius: 11, border: `1.5px solid ${dir === d ? RUSH.navy : RUSH.line}`, background: dir === d ? RUSH.navy : "#fff", color: dir === d ? "#fff" : RUSH.ink2, fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}>{d}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Field label="Reason"><Select value={(dir === "Money In" ? inOpts : outOpts)[0]} onChange={() => {}} options={dir === "Money In" ? inOpts : outOpts} /></Field>
          <Field label="Amount" hint="BHD"><Input mono value="" placeholder="0.000" onChange={() => {}} /></Field>
          <Field label="Method"><Select value="Cash" onChange={() => {}} options={["Cash", "Bank transfer", "Card"]} /></Field>
          <Field label="Date"><Input mono value="14 Jun 2026" onChange={() => {}} /></Field>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: RUSH.bg, borderRadius: 11 }}>
          <div><div style={{ fontSize: 14, fontWeight: 600 }}>Affects P&L</div><div style={{ fontSize: 12.5, color: RUSH.ink3 }}>Default is cash flow only</div></div>
          <Toggle on={pl} onChange={setPl} />
        </div>
      </Card>
    </FormShell>
  );
}
