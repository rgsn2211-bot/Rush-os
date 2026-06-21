/* Rush OS — Owner: Profit Reports, Losses, Delivery (report/settlement/settings), Complimentary, AI, Reports menu. */
const { useState: useStateOF } = React;
const DF = window.RushData;

/* ---------- Profit Reports ---------- */
function PLBlock({ title, sub, data, lens }) {
  const expenses = data.expenses ?? (data.grossProfit - data.netProfit);
  const rows = [
    ["Revenue", data.revenue, false, RUSH.ink],
    ["COGS", -data.cogs, false, RUSH.ink2],
    ["Gross profit", data.grossProfit, true, RUSH.ink],
    ["Expenses", -expenses, false, RUSH.ink2],
    ["Net profit", data.netProfit, true, RUSH.green],
  ];
  return (
    <Card pad={0}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${RUSH.line2}` }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: RUSH.ink3, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ padding: "8px 20px 16px" }}>
        {rows.map(([l, v, bold, c], i) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none", borderTopWidth: bold ? 1.5 : 1 }}>
            <span style={{ fontSize: bold ? 15 : 14, fontWeight: bold ? 700 : 500, color: c }}>{l}</span>
            <span style={{ fontFamily: RUSH.mono, fontSize: bold ? 16 : 14.5, fontWeight: bold ? 700 : 600, color: v < 0 ? RUSH.ink2 : c }}>{v < 0 ? "(" + money(Math.abs(v)) + ")" : money(v)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OwnerProfit({ mobile }) {
  const [range, setRange] = useState("Month-to-date");
  const [lens, setLens] = useState("pl");
  const [section, setSection] = useState("summary");
  const m = DF.monthToDate, d = DF.lastClosedDay;
  const sections = [{ v: "summary", label: "P&L Summary" }, { v: "products", label: "Product Breakdown" }, { v: "expenses", label: "Expense Breakdown" }, { v: "losses", label: "Losses" }];

  const totalExp = DF.expenseBreakdown.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHead title="Profit Reports" sub="Finalized figures · choose a date range and lens"
        right={<Btn kind="secondary" icon="upload">Export</Btn>} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <DateRangeControl value={range} onChange={setRange} />
        <div style={{ display: "flex", background: RUSH.bg, border: `1px solid ${RUSH.line}`, borderRadius: 10, padding: 3, gap: 2 }}>
          {[["pl", "P&L (sales date)"], ["cash", "Cash Flow (money date)"]].map(([v, l]) => (
            <button key={v} onClick={() => setLens(v)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: lens === v ? "#fff" : "transparent", color: lens === v ? RUSH.navy : RUSH.ink3, fontWeight: 600, fontSize: 12.5, boxShadow: lens === v ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}><SegTabs tabs={sections} value={section} onChange={setSection} size="sm" /></div>

      {lens === "cash" && (
        <div style={{ marginBottom: 16, display: "flex", gap: 10, padding: 13, background: RUSH.blueBg, borderRadius: 11, alignItems: "flex-start" }}>
          <Icon name="alert" size={18} color={RUSH.blue} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>Cash Flow lens recognizes money on the date it was received/paid (e.g. card settlements, unpaid purchases) — it can differ from the P&L which uses sales/expense dates.</div>
        </div>
      )}

      {section === "summary" && (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <PLBlock title={lens === "pl" ? "Month-to-Date (P&L)" : "Month-to-Date (Cash)"} sub={m.label} data={lens === "pl" ? m : { ...m, revenue: m.revenue - 124.2, netProfit: m.netProfit - 60 }} lens={lens} />
          <PLBlock title="Last Closed Day" sub={d.date} data={{ revenue: d.revenue, cogs: d.cogs, grossProfit: d.grossProfit, netProfit: d.netProfit }} lens={lens} />
        </div>
      )}

      {section === "products" && (
        <Card pad={0}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${RUSH.line2}`, fontSize: 15, fontWeight: 700 }}>Product Profit Breakdown</div>
          <Table cols={[
            { h: "Product", cell: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
            { h: "Qty sold", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.qty}</span> },
            { h: "Revenue", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.revenue)}</span> },
            { h: "COGS", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{money(r.cogs)}</span> },
            { h: "Gross profit", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600, color: RUSH.green }}>{money(r.gross)}</span> },
            { h: "Margin %", align: "right", cell: (r) => <Pill kind={(r.gross / r.revenue) >= 0.7 ? "ok" : "expiring"}>{((r.gross / r.revenue) * 100).toFixed(0)}%</Pill> },
          ]} rows={DF.productBreakdown} />
          <div style={{ padding: "12px 20px", fontSize: 12.5, color: RUSH.ink3 }}>Product profit excludes waste &amp; complimentary — those are tracked in the Losses section.</div>
        </Card>
      )}

      {section === "expenses" && (
        <Card pad={0}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${RUSH.line2}`, fontSize: 15, fontWeight: 700 }}>Expense Breakdown</div>
          {DF.expenseBreakdown.map((e, i) => {
            const pct = (e.amount / totalExp) * 100;
            return (
              <div key={e.cat} style={{ padding: "13px 20px", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{e.cat}</span>
                  <span style={{ display: "flex", gap: 12 }}><span style={{ fontSize: 12.5, color: RUSH.ink3 }}>{pct.toFixed(0)}%</span><span style={{ fontFamily: RUSH.mono, fontWeight: 600, fontSize: 13.5 }}>{money(e.amount)}</span></span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: RUSH.line, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: RUSH.navy, borderRadius: 999 }} /></div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 20px", borderTop: `2px solid ${RUSH.line}`, background: RUSH.bg }}><span style={{ fontWeight: 700 }}>Total expenses</span><span style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 15 }}>{money(totalExp)} BHD</span></div>
        </Card>
      )}

      {section === "losses" && <LossesContent mobile={mobile} />}
    </div>
  );
}
window.OwnerProfit = OwnerProfit;

/* ---------- Losses (shared) ---------- */
function LossesContent({ mobile }) {
  const L = DF.losses;
  const total = L.summary.reduce((s, x) => s + x.amount, 0);
  const cmap = { blue: { c: RUSH.blue, bg: RUSH.blueBg }, amber: { c: RUSH.amber, bg: RUSH.amberBg }, red: { c: RUSH.red, bg: RUSH.redBg } };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginBottom: 18 }}>
        <Card pad={16} style={{ background: RUSH.navy }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Total losses (MTD)</div>
          <div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 5 }}>{money(total)}</div>
        </Card>
        {L.summary.map((x) => {
          const cc = cmap[x.c];
          return (
            <Card key={x.type} pad={16} style={{ borderTop: `3px solid ${cc.c}` }}>
              <div style={{ fontFamily: RUSH.mono, fontSize: 19, fontWeight: 700, color: cc.c }}>{money(x.amount)}</div>
              <div style={{ fontSize: 12.5, color: RUSH.ink2, fontWeight: 600, marginTop: 3 }}>{x.type}</div>
            </Card>
          );
        })}
      </div>
      <Card pad={0}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${RUSH.line2}`, fontSize: 15, fontWeight: 700 }}>Loss Detail</div>
        <Table cols={[
          { h: "Type", cell: (r) => <Badge color={RUSH.ink2} bg={RUSH.bg}>{r.type}</Badge> },
          { h: "Item / Product", cell: (r) => <span style={{ fontWeight: 600 }}>{r.item}</span> },
          { h: "Quantity", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.qty}</span> },
          { h: "Value", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.amount)}</span> },
        ]} rows={L.detail} />
      </Card>
    </div>
  );
}
function OwnerLosses({ mobile }) {
  const [range, setRange] = useState("Month-to-date");
  return (
    <div>
      <PageHead title="Losses" sub="Complimentary, waste, remakes, staff drinks & expired stock" />
      <div style={{ marginBottom: 18 }}><DateRangeControl value={range} onChange={setRange} /></div>
      <LossesContent mobile={mobile} />
    </div>
  );
}
window.OwnerLosses = OwnerLosses;

/* ---------- Delivery Apps ---------- */
function OwnerDelivery({ mobile }) {
  const [tab, setTab] = useState("report");
  const [range, setRange] = useState("Month-to-date");
  const dv = DF.delivery;
  const tabs = [{ v: "report", label: "Report" }, { v: "settlement", label: "Settlement" }, { v: "settings", label: "Settings" }];
  return (
    <div>
      <PageHead title="Delivery Apps" sub="Per-platform sales, commission & monthly settlement" />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <SegTabs tabs={tabs} value={tab} onChange={setTab} />
        {tab !== "settings" && <DateRangeControl value={range} onChange={setRange} presets={["Last 7 days", "Month-to-date", "Custom"]} />}
      </div>

      {tab === "report" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 14, marginBottom: 20 }}>
            <Metric label="Gross sales" value={money(dv.grossSales)} />
            <Metric label="Orders" value={dv.orders} suffix="" />
            <Metric label="Commission" value={money(dv.commission)} accent={RUSH.red} caption={`${dv.commissionRate}% blended`} />
            <Metric label="Net payout" value={money(dv.netPayout)} accent={RUSH.green} />
            <Metric label="Profit impact" value={money(dv.profitImpact)} />
          </div>
          <Card pad={0}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${RUSH.line2}`, fontSize: 15, fontWeight: 700 }}>By Platform</div>
            <Table cols={[
              { h: "App", cell: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
              { h: "Gross sales", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.sales)}</span> },
              { h: "Orders", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.orders}</span> },
              { h: "Commission %", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.red }}>{r.rate}%</span> },
              { h: "Fixed fees", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink3 }}>{money(r.orders * 0.3)}</span> },
              { h: "Net payout", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600, color: RUSH.green }}>{money(r.payout)}</span> },
            ]} rows={dv.apps} />
          </Card>
        </div>
      )}

      {tab === "settlement" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", gap: 10, padding: 13, background: RUSH.blueBg, borderRadius: 11, alignItems: "flex-start" }}>
            <Icon name="alert" size={18} color={RUSH.blue} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>Settlement reconciles EOD gross sales against the platform's actual payout (commission + fixed fees + deductions). Default monthly — pick a custom range above.</div>
          </div>
          <Card pad={0}>
            <Table cols={[
              { h: "Platform", cell: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
              { h: "Gross (EOD)", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{money(r.sales)}</span> },
              { h: "Orders", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.orders}</span> },
              { h: "Commission", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.red }}>{money(r.sales * r.rate / 100)}</span> },
              { h: "Fixed fees", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink3 }}>{money(r.orders * 0.3)}</span> },
              { h: "Expected net", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.payout)}</span> },
              { h: "Actual / status", cell: (r, i) => i === 0 ? <span style={{ fontFamily: RUSH.mono, color: RUSH.green, fontWeight: 600 }}>{money(r.payout - 2.5)}</span> : <Pill kind="warning">Pending</Pill> },
            ]} rows={dv.apps} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 20px", borderTop: `2px solid ${RUSH.line}`, background: RUSH.bg }}><span style={{ fontWeight: 700 }}>Expected net payout</span><span style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 15 }}>{money(dv.netPayout)} BHD</span></div>
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <Card pad={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${RUSH.line2}` }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Platform Settings</div><Btn kind="secondary" size="sm" icon="plus">Add Platform</Btn>
          </div>
          <Table cols={[
            { h: "Platform", cell: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
            { h: "Commission %", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.commission}%</span> },
            { h: "Fixed fee / order", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{money(r.fixedFee)}</span> },
            { h: "Settlement", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.delay}</span> },
            { h: "Payout", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.payout}</span> },
            { h: "Active", cell: (r) => <Pill kind={r.active ? "ok" : "info"}>{r.active ? "Active" : "Inactive"}</Pill> },
            { h: "", cell: () => <Icon name="settings" size={16} color={RUSH.ink3} /> },
          ]} rows={DF.deliverySettings} />
        </Card>
      )}
    </div>
  );
}
window.OwnerDelivery = OwnerDelivery;

/* ---------- Complimentary ---------- */
function OwnerComp({ mobile }) {
  const [range, setRange] = useState("Month-to-date");
  const total = DF.complimentary.reduce((s, c) => s + c.amount, 0);
  return (
    <div>
      <PageHead title="Complimentary Review" sub="Free items given away — from daily POS uploads" />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <DateRangeControl value={range} onChange={setRange} />
        <Card pad={14} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Icon name="gift" size={20} color={RUSH.navy} /><div><div style={{ fontSize: 12, color: RUSH.ink3, fontWeight: 600 }}>Complimentary value</div><div style={{ fontFamily: RUSH.mono, fontSize: 18, fontWeight: 700 }}>{money(total + 38.2)} BHD</div></div>
        </Card>
      </div>
      <Card pad={0}>
        <Table cols={[
          { h: "Date", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.date}</span> },
          { h: "Item", cell: (r) => <span style={{ fontWeight: 600 }}>{r.item}</span> },
          { h: "Qty", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.qty}</span> },
          { h: "Amount", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.amount)}</span> },
          { h: "Reason", cell: (r) => <Badge color={RUSH.ink2} bg={RUSH.bg}>{r.reason}</Badge> },
          { h: "Worker note", wrap: true, cell: (r) => <span style={{ color: RUSH.ink3 }}>{r.note}</span> },
        ]} rows={DF.complimentary} />
      </Card>
    </div>
  );
}
window.OwnerComp = OwnerComp;

/* ---------- Reports menu (mobile) ---------- */
function OwnerReports({ go }) {
  const items = [
    { id: "profit", label: "Profit Reports", desc: "P&L, products, expenses, losses", icon: "chart" },
    { id: "delivery", label: "Delivery Apps", desc: "Sales, commission, settlement", icon: "delivery" },
    { id: "comp", label: "Complimentary", desc: "Free items given away", icon: "gift" },
    { id: "losses", label: "Losses", desc: "Waste, comp, remakes, expired", icon: "trash" },
  ];
  return (
    <div>
      <PageHead title="Reports" sub="Performance & loss reporting" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it) => (
          <button key={it.id} onClick={() => go(it.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "#fff", border: `1px solid ${RUSH.line}`, borderRadius: 14, cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: RUSH.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={it.icon} size={23} color={RUSH.navy} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15.5, fontWeight: 700 }}>{it.label}</div><div style={{ fontSize: 13, color: RUSH.ink3, marginTop: 2 }}>{it.desc}</div></div>
            <Icon name="chevron" size={18} color={RUSH.ink3} />
          </button>
        ))}
      </div>
    </div>
  );
}
window.OwnerReports = OwnerReports;

/* ---------- AI Insights ---------- */
function OwnerAI({ mobile }) {
  const PR = { High: { c: RUSH.red, bg: RUSH.redBg }, Medium: { c: RUSH.amber, bg: RUSH.amberBg }, Low: { c: RUSH.blue, bg: RUSH.blueBg } };
  return (
    <div>
      <PageHead title="AI Insights" sub="Automated analysis of your operations — preview"
        right={<Badge color={RUSH.navy} bg={RUSH.blueBg}>Coming soon · sample output</Badge>} />
      <div style={{ display: "flex", gap: 12, padding: 18, background: `linear-gradient(100deg, ${RUSH.navy}, ${RUSH.navy2})`, borderRadius: 14, marginBottom: 22, alignItems: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="ai" size={26} color="#fff" /></div>
        <div style={{ color: "#fff" }}><div style={{ fontSize: 16, fontWeight: 700 }}>3 insights from the last 14 days</div><div style={{ fontSize: 13.5, opacity: 0.8, marginTop: 2 }}>Rush OS will analyze sales, waste, costs and cash to surface what to act on.</div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {DF.aiInsights.map((ins) => {
          const p = PR[ins.priority];
          return (
            <Card key={ins.id} pad={0}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${RUSH.line2}`, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 999, background: p.bg, color: p.c, fontSize: 12, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: p.c }} />{ins.priority} priority</span>
                <span style={{ fontSize: 16.5, fontWeight: 700, color: RUSH.ink }}>{ins.title}</span>
              </div>
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 700, color: RUSH.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>What happened</div><div style={{ fontSize: 14, color: RUSH.ink2, lineHeight: 1.55 }}>{ins.what}</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 700, color: RUSH.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Why it may have happened</div><div style={{ fontSize: 14, color: RUSH.ink2, lineHeight: 1.55 }}>{ins.why}</div></div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: RUSH.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Recommended actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ins.actions.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: RUSH.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><Icon name="check" size={13} color={RUSH.green} strokeWidth={2.4} /></div>
                        <span style={{ fontSize: 13.5, color: RUSH.ink, lineHeight: 1.45 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${RUSH.line2}` }}>
                    <div style={{ fontSize: 11.5, color: RUSH.ink3, fontWeight: 600, marginBottom: 6 }}>Data used</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ins.data.map((d) => <Badge key={d} color={RUSH.ink2} bg={RUSH.bg}>{d}</Badge>)}</div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
window.OwnerAI = OwnerAI;
