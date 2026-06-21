/* Rush OS — Owner: Dashboard + Alerts (revised). */
const { useState: useStateO } = React;
const DO = window.RushData;

/* ---- shared owner primitives ---- */
function Metric({ label, value, suffix = "BHD", delta, deltaUp, caption, accent, big }) {
  return (
    <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: RUSH.ink3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
        <span style={{ fontFamily: RUSH.mono, fontSize: big ? 28 : 23, fontWeight: 700, color: accent || RUSH.ink, letterSpacing: -0.5 }}>{value}</span>
        {suffix && <span style={{ fontSize: 12.5, color: RUSH.ink3, fontWeight: 500 }}>{suffix}</span>}
      </div>
      {(delta || caption) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {delta && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12.5, fontWeight: 700, color: deltaUp ? RUSH.green : RUSH.red }}>
            <Icon name={deltaUp ? "arrowUp" : "arrowDown"} size={14} />{delta}</span>}
          {caption && <span style={{ fontSize: 12.5, color: RUSH.ink3 }}>{caption}</span>}
        </div>
      )}
    </Card>
  );
}
window.Metric = Metric;

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 44, height: 26, borderRadius: 999, border: "none", background: on ? RUSH.navy : "#CDD3DA", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: "#fff", transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
    </button>
  );
}
window.Toggle = Toggle;

function Table({ cols, rows, onRow }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr>{cols.map((c, i) => <th key={i} style={{ textAlign: c.align || "left", padding: "11px 16px", fontSize: 11.5, fontWeight: 700, color: RUSH.ink3, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${RUSH.line}`, whiteSpace: "nowrap" }}>{c.h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} onClick={onRow ? () => onRow(r, ri) : undefined} className={onRow ? "rush-row" : ""} style={{ cursor: onRow ? "pointer" : "default" }}>
              {cols.map((c, ci) => <td key={ci} style={{ textAlign: c.align || "left", padding: "13px 16px", borderBottom: `1px solid ${RUSH.line2}`, color: RUSH.ink, whiteSpace: c.wrap ? "normal" : "nowrap" }}>{c.cell(r, ri)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
window.Table = Table;

function PageHead({ title, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 25, fontWeight: 700, color: RUSH.ink, letterSpacing: -0.5 }}>{title}</div>
        {sub && <div style={{ fontSize: 14, color: RUSH.ink3, marginTop: 4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}
window.PageHead = PageHead;

/* ---------- Owner Dashboard ---------- */
const RANGE_FACTOR = { "Last closed day": 0.074, "Last 7 days": 0.52, "Month-to-date": 1, "Custom": 0.78 };
const RANGE_LABEL = { "Last closed day": "Sat, 14 Jun 2026", "Last 7 days": "8–14 Jun 2026", "Month-to-date": "1–14 Jun 2026", "Custom": "1–14 Jun 2026" };

function OwnerHome({ go, mobile }) {
  const [range, setRange] = useState("Month-to-date");
  const m = DO.monthToDate;
  const f = RANGE_FACTOR[range];
  const sc = (n) => money(n * f);
  const inv = DO.inventory;
  const low = inv.filter((i) => i.status === "low").length;
  const exp = inv.filter((i) => i.status === "expiring").length;

  const metrics = [
    { label: "Revenue", value: sc(m.revenue), delta: "8.1%", up: true, cap: "vs prev period" },
    { label: "COGS", value: sc(m.cogs), cap: `${((m.cogs / m.revenue) * 100).toFixed(0)}% of revenue` },
    { label: "Expenses", value: sc(m.expenses) },
    { label: "Gross profit", value: sc(m.grossProfit), accent: RUSH.ink },
    { label: "Net profit", value: sc(m.netProfit), accent: RUSH.green, delta: "11%", up: true },
    { label: "Cash position", value: money(m.cashPosition), accent: RUSH.navy, cap: "live" },
  ];

  return (
    <div>
      <PageHead title="Dashboard" sub={`Finalized figures · ${RANGE_LABEL[range]}`} />
      <div style={{ marginBottom: 22 }}><DateRangeControl value={range} onChange={setRange} /></div>

      {/* Review banner */}
      <button onClick={() => go("review")} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#fff", border: `1px solid ${RUSH.line}`, borderLeft: `3px solid ${RUSH.amber}`, borderRadius: 12, cursor: "pointer", marginBottom: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: RUSH.amberBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="checklist" size={21} color={RUSH.amber} /></div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{DO.reviewItems.length} items need your review</div><div style={{ fontSize: 13, color: RUSH.ink3 }}>New items, cash purchases, variances & unconfirmed costs</div></div>
        <Icon name="chevron" size={18} color={RUSH.ink3} />
      </button>

      {/* metrics */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(auto-fit, minmax(165px,1fr))", gap: 14, marginBottom: 22 }}>
        {metrics.map((x) => <Metric key={x.label} label={x.label} value={x.value} accent={x.accent} delta={x.delta} deltaUp={x.up} caption={x.cap} />)}
      </div>

      {/* revenue trend + inventory status + alerts */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card pad={20}>
          <SectionTitle sub="Daily revenue, last 14 closed days" right={<Btn kind="ghost" size="sm" icon="chart" onClick={() => go("profit")}>P&amp;L</Btn>}>Revenue Trend</SectionTitle>
          <BarMini data={DO.revenueTrend} height={120} color={RUSH.navy} soft />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: RUSH.ink3 }}><span>1 Jun</span><span>14 Jun</span></div>
        </Card>
        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16 }}>
          <button onClick={() => go("inv")} style={{ textAlign: "left", cursor: "pointer", padding: 0, border: "none", background: "none" }}>
            <Card pad={18} style={{ height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 15, fontWeight: 700 }}>Inventory status</span><Icon name="chevron" size={16} color={RUSH.ink3} /></div>
              <div style={{ display: "flex", gap: 18 }}>
                <div><div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, color: RUSH.red }}>{low}</div><div style={{ fontSize: 12, color: RUSH.ink3 }}>low stock</div></div>
                <div><div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, color: RUSH.amber }}>{exp}</div><div style={{ fontSize: 12, color: RUSH.ink3 }}>expiring</div></div>
                <div><div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, color: RUSH.ink }}>{money(m.inventoryValue)}</div><div style={{ fontSize: 12, color: RUSH.ink3 }}>value</div></div>
              </div>
            </Card>
          </button>
          <button onClick={() => go("alerts")} style={{ textAlign: "left", cursor: "pointer", padding: 0, border: "none", background: "none" }}>
            <Card pad={18} style={{ height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 15, fontWeight: 700 }}>Alerts</span><Icon name="chevron" size={16} color={RUSH.ink3} /></div>
              <div style={{ display: "flex", gap: 18 }}>
                <div><div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, color: RUSH.red }}>2</div><div style={{ fontSize: 12, color: RUSH.ink3 }}>urgent</div></div>
                <div><div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, color: RUSH.amber }}>5</div><div style={{ fontSize: 12, color: RUSH.ink3 }}>warnings</div></div>
              </div>
            </Card>
          </button>
        </div>
      </div>

      {/* last closed day quick line */}
      <Card pad={18} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="cash" size={20} color={RUSH.navy} /><span style={{ fontSize: 14, color: RUSH.ink2 }}>Last closed day cash difference</span></div>
        <span style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 16, color: RUSH.red }}>−{money(Math.abs(DO.lastClosedDay.cashDifference))} BHD</span>
      </Card>
    </div>
  );
}
window.OwnerHome = OwnerHome;

/* ---------- Alerts (revised settings) ---------- */
function OwnerAlerts({ mobile }) {
  const [filter, setFilter] = useState("All");
  const [settings, setSettings] = useState(false);
  const cats = ["All", "Inventory", "Cash", "Sales", "Waste", "Expiry", "System"];
  const list = DO.alerts.filter((a) => filter === "All" || a.cat === filter);
  const [toggles, setToggles] = useState({ "Cash difference": true, "High waste": true, "Low stock": true, "Expiry": true, "Missing EOD": true, "Missing receipt": true, "Unreviewed item": true, "Sales anomalies": false });

  return (
    <div>
      <PageHead title="Alerts" sub={`${DO.alerts.filter((a) => a.level !== "info").length} active alerts need attention`}
        right={<Btn kind={settings ? "primary" : "secondary"} icon="settings" onClick={() => setSettings(!settings)}>Alert Settings</Btn>} />

      {settings && (
        <Card style={{ marginBottom: 24 }} pad={22}>
          <SectionTitle sub="General alert rules only. Per-item thresholds (min stock, lead time, safety days, expiry override) live in each Inventory item's settings.">Alert Settings</SectionTitle>

          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 22 }}>
            <Field label="Cash difference threshold" hint="BHD"><Input mono value="1.000" onChange={() => {}} /></Field>
            <Field label="High waste — by amount" hint="BHD/day"><Input mono value="10.000" onChange={() => {}} /></Field>
            <Field label="High waste — by % of sales" hint="%"><Input mono value="1.5" onChange={() => {}} /></Field>
            <Field label="Missing EOD alert time" hint="after closing"><Input mono value="11:30 PM" onChange={() => {}} /></Field>
            <Field label="Default expiry warning" hint="days before"><Input mono value="3" onChange={() => {}} /></Field>
            <Field label="Default severity" hint="for new rules"><Select value="Warning" onChange={() => {}} options={["Info", "Warning", "Urgent"]} /></Field>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: RUSH.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Alerts on / off</div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "10px 40px" }}>
            {Object.keys(toggles).map((k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${RUSH.line2}` }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: RUSH.ink }}>{k}</span>
                <Toggle on={toggles[k]} onChange={(v) => setToggles({ ...toggles, [k]: v })} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 10, padding: 13, background: RUSH.blueBg, borderRadius: 10, alignItems: "flex-start" }}>
            <Icon name="alert" size={18} color={RUSH.blue} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>Minimum stock, safety days and supplier lead time are configured <b>per item</b> in Inventory → item settings. Expiry warning days default here but can be overridden per item.</div>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
        {[["Urgent", 2, "urgent"], ["Low stock", 3, "warning"], ["Cash difference", 1, "warning"], ["High waste", 1, "warning"], ["Expiring soon", 2, "warning"], ["Missing closing", 1, "urgent"]].map(([l, n, k]) => {
          const s = STATUS[k];
          return (
            <Card key={l} pad={15} style={{ borderTop: `3px solid ${s.c}` }}>
              <div style={{ fontFamily: RUSH.mono, fontSize: 24, fontWeight: 700, color: s.c }}>{n}</div>
              <div style={{ fontSize: 13, color: RUSH.ink2, fontWeight: 600, marginTop: 3 }}>{l}</div>
            </Card>
          );
        })}
      </div>

      <div style={{ marginBottom: 16 }}><SegTabs tabs={cats} value={filter} onChange={setFilter} /></div>

      <Card pad={0}>
        {list.map((a, i) => {
          const s = STATUS[a.level];
          return (
            <div key={a.id} style={{ display: "flex", gap: 14, padding: "16px 20px", borderTop: i ? `1px solid ${RUSH.line2}` : "none", alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={a.level === "urgent" ? "alert" : a.level === "info" ? "bell" : "fire"} size={19} color={s.c} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: RUSH.ink }}>{a.title}</span>
                  <Badge color={RUSH.ink2} bg={RUSH.bg}>{a.cat}</Badge>
                </div>
                <div style={{ fontSize: 13.5, color: RUSH.ink2, marginTop: 4 }}>{a.detail}</div>
                <div style={{ fontSize: 12, color: RUSH.ink3, marginTop: 6 }}>{a.time}</div>
              </div>
              <Pill kind={a.level}>{s.label}</Pill>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
window.OwnerAlerts = OwnerAlerts;
