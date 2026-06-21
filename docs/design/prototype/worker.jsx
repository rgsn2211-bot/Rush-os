/* Rush OS — Worker tablet app: shell, home, daily closing wizard. */
const { useState } = React;
const D = window.RushData;

function WorkerSubHeader({ title, sub, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px", background: "#fff", borderBottom: `1px solid ${RUSH.line}`, position: "sticky", top: 0, zIndex: 5 }}>
      <button onClick={onBack} style={{ width: 42, height: 42, borderRadius: 11, border: `1px solid ${RUSH.line}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: RUSH.navy, flexShrink: 0 }}>
        <Icon name="back" size={22} />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: RUSH.ink, letterSpacing: -0.2 }}>{title}</div>
        {sub && <div style={{ fontSize: 13.5, color: RUSH.ink3, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function PinPad({ value, onChange, max = 4 }) {
  const press = (k) => {
    if (k === "del") return onChange(value.slice(0, -1));
    if (value.length >= max) return;
    onChange(value + k);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 18 }}>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} style={{ width: 46, height: 56, borderRadius: 12, border: `1.5px solid ${i < value.length ? RUSH.navy : RUSH.line}`, background: i < value.length ? RUSH.navy : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff" }}>
            {i < value.length ? "•" : ""}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
          k === "" ? <div key={i} /> :
          <button key={i} onClick={() => press(k)} style={{ height: 58, borderRadius: 12, border: `1px solid ${RUSH.line}`, background: "#fff", fontSize: 22, fontWeight: 600, fontFamily: RUSH.mono, color: RUSH.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {k === "del" ? <Icon name="back" size={22} /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}
window.PinPad = PinPad;

function SuccessView({ title, sub, onDone, items }) {
  return (
    <div style={{ padding: "60px 28px", textAlign: "center", maxWidth: 460, margin: "0 auto" }}>
      <div style={{ width: 84, height: 84, borderRadius: 999, background: RUSH.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
        <Icon name="check" size={44} color={RUSH.green} strokeWidth={2.4} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: RUSH.ink }}>{title}</div>
      <div style={{ fontSize: 15, color: RUSH.ink3, marginTop: 8, lineHeight: 1.5 }}>{sub}</div>
      {items && (
        <Card style={{ marginTop: 22, textAlign: "left" }} pad={16}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
              <span style={{ fontSize: 14, color: RUSH.ink2 }}>{it[0]}</span>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: RUSH.mono, color: RUSH.ink }}>{it[1]}</span>
            </div>
          ))}
        </Card>
      )}
      <Btn kind="primary" size="lg" full style={{ marginTop: 26 }} onClick={onDone} icon="home">Back to Home</Btn>
    </div>
  );
}
window.SuccessView = SuccessView;

/* ---------- Daily Closing Wizard ---------- */
function ClosingWizard({ onExit }) {
  const [step, setStep] = useState(0);
  const [salesUp, setSalesUp] = useState(false);
  const [compUp, setCompUp] = useState(false);
  const [pin, setPin] = useState("");
  const [counts, setCounts] = useState({});
  const steps = ["Sales by Item", "Complimentary", "EOD Numbers", "Cash Count", "Review Cash Out", "Submit"];
  const denoms = [20, 10, 5, 1, 0.5, 0.1];
  const denomLabels = { 20: "20 BD", 10: "10 BD", 5: "5 BD", 1: "1 BD", 0.5: "500 fils", 0.1: "100 fils" };
  const countedTotal = denoms.reduce((s, d) => s + d * (parseInt(counts[d]) || 0), 0);
  const expectedCash = 119.350;
  const diff = countedTotal - expectedCash;
  const [done, setDone] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const prev = () => (step === 0 ? onExit() : setStep((s) => s - 1));

  if (done) return (
    <div>
      <WorkerSubHeader title="Daily Closing" onBack={onExit} />
      <SuccessView title="Daily closing submitted" sub="Sat, 14 Jun 2026 has been finalized. The owner dashboard will update with today's figures."
        items={[["Total orders", "214"], ["Total sales", money(642.350) + " BHD"], ["Cash difference", "−" + money(Math.abs(diff || -2.15)) + " BHD"], ["Submitted by", "Sara · PIN ••••"]]}
        onDone={onExit} />
    </div>
  );

  return (
    <div style={{ paddingBottom: 100 }}>
      <WorkerSubHeader title="Daily Closing" sub={`Step ${step + 1} of 6 · ${steps[step]}`} onBack={prev} />
      {/* progress */}
      <div style={{ display: "flex", gap: 6, padding: "14px 22px 4px" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i <= step ? RUSH.navy : RUSH.line }} />
        ))}
      </div>

      <div style={{ padding: "18px 22px" }}>
        {step === 0 && (
          <div>
            <SectionTitle sub="Export the 'Sales by Item' report from your POS and upload the file.">Upload POS Sales by Item</SectionTitle>
            <DropZone label="Tap to upload POS export" sub="CSV or PDF from POS" done={salesUp} onClick={() => setSalesUp(true)} height={180} />
            {salesUp && <Card style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }} pad={14}>
              <Icon name="checklist" color={RUSH.navy} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>sales_by_item_14jun.csv</div><div style={{ fontSize: 12.5, color: RUSH.ink3 }}>214 line items detected</div></div><Pill kind="ok">Parsed</Pill>
            </Card>}
          </div>
        )}
        {step === 1 && (
          <div>
            <SectionTitle sub="Upload the complimentary / free items report so the owner can review giveaways.">Upload Complimentary Report</SectionTitle>
            <DropZone label="Tap to upload complimentary report" sub="CSV or PDF from POS" done={compUp} onClick={() => setCompUp(true)} height={180} />
            {compUp && <Card style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }} pad={14}>
              <Icon name="gift" color={RUSH.navy} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>complimentary_14jun.csv</div><div style={{ fontSize: 12.5, color: RUSH.ink3 }}>8 complimentary items · 8.700 BHD</div></div><Pill kind="ok">Parsed</Pill>
            </Card>}
          </div>
        )}
        {step === 2 && (
          <div>
            <SectionTitle sub="Confirm the closing numbers from your POS summary.">Enter EOD Numbers</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Date"><Input big mono value="14 Jun 2026" onChange={() => {}} /></Field>
              <Field label="Worker PIN"><Input big mono type="password" value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value)} /></Field>
              <Field label="Total orders"><Input big mono value="214" onChange={() => {}} /></Field>
              <Field label="Discount total (BHD)"><Input big mono value="18.250" onChange={() => {}} /></Field>
              <Field label="Cash sales (BHD)"><Input big mono value="121.500" onChange={() => {}} /></Field>
              <Field label="Card sales (BHD)"><Input big mono value="388.250" onChange={() => {}} /></Field>
              <Field label="BenefitPay sales (BHD)"><Input big mono value="96.600" onChange={() => {}} /></Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: RUSH.ink2, marginBottom: 8 }}>Delivery apps — by platform</div>
              <Card pad={0}>
                {DW.deliveryEOD.map((p, i) => (
                  <div key={p.name} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, alignItems: "center", padding: "12px 14px", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</div>
                    <Input big mono value={money(p.sales)} onChange={() => {}} />
                    <Input big mono value={String(p.orders)} onChange={() => {}} />
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, padding: "6px 14px 4px" }}>
                  <span />
                  <span style={{ fontSize: 11, color: RUSH.ink3, fontWeight: 600, textAlign: "center" }}>Sales (BHD)</span>
                  <span style={{ fontSize: 11, color: RUSH.ink3, fontWeight: 600, textAlign: "center" }}>Orders</span>
                </div>
              </Card>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 11, padding: 14, background: RUSH.blueBg, borderRadius: 12, alignItems: "flex-start" }}>
              <Icon name="alert" size={20} color={RUSH.blue} />
              <div style={{ fontSize: 13.5, color: RUSH.ink2, lineHeight: 1.5 }}><b>Delivery apps:</b> enter only sales &amp; order count per active platform. Commission, fixed fees and net payout are reconciled <b>monthly</b> by the owner — not at end of day.</div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <SectionTitle sub="Count the cash drawer by denomination. The system compares it to expected cash.">Enter Actual Cash Count</SectionTitle>
            <Card pad={16}>
              {denoms.map((d, i) => (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
                  <div style={{ width: 90, fontSize: 15, fontWeight: 600, color: RUSH.ink }}>{denomLabels[d]}</div>
                  <span style={{ color: RUSH.ink3, fontSize: 15 }}>×</span>
                  <input value={counts[d] || ""} onChange={(e) => setCounts({ ...counts, [d]: e.target.value.replace(/\D/g, "") })} placeholder="0"
                    style={{ width: 80, padding: "10px 12px", fontSize: 17, fontFamily: RUSH.mono, fontWeight: 600, textAlign: "center", border: `1px solid ${RUSH.line}`, borderRadius: 10, outline: "none" }} />
                  <div style={{ flex: 1, textAlign: "right", fontFamily: RUSH.mono, fontSize: 15, fontWeight: 600, color: RUSH.ink2 }}>{money(d * (parseInt(counts[d]) || 0))}</div>
                </div>
              ))}
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
              {[["Counted", countedTotal, RUSH.ink], ["Expected", expectedCash, RUSH.ink2], ["Difference", diff, Math.abs(diff) < 0.001 ? RUSH.green : RUSH.red]].map(([l, v, c]) => (
                <Card key={l} pad={14} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12.5, color: RUSH.ink3, marginBottom: 6 }}>{l}</div>
                  <div style={{ fontFamily: RUSH.mono, fontSize: 18, fontWeight: 700, color: c }}>{(v < 0 ? "−" : "") + money(Math.abs(v))}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <SectionTitle sub="These cash-outs were recorded from the register today. Confirm before closing.">Review Cash Out from Register</SectionTitle>
            <Card pad={0}>
              {[["Inventory purchase", "Daily Bake — cookies", 6.000], ["General expense", "Cleaning supplies", 3.500], ["Owner withdrawal", "Owner — Ahmed", 50.000]].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: RUSH.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="cash" size={20} color={RUSH.navy} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14.5 }}>{r[0]}</div><div style={{ fontSize: 13, color: RUSH.ink3 }}>{r[1]}</div></div>
                  <Money value={r[2]} size={15} />
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 16px", borderTop: `2px solid ${RUSH.line}`, background: RUSH.bg }}>
                <span style={{ fontWeight: 700, fontSize: 14.5 }}>Total cash out</span><Money value={59.5} size={16} weight={700} />
              </div>
            </Card>
          </div>
        )}
        {step === 5 && (
          <div>
            <SectionTitle sub="Review the summary, then submit. This finalizes the day — it can only be done once.">Submit Daily Closing</SectionTitle>
            <Card pad={18}>
              {[["Date", "Sat, 14 Jun 2026"], ["Sales by Item", salesUp ? "Uploaded ✓" : "Missing"], ["Complimentary report", compUp ? "Uploaded ✓" : "Missing"], ["Total sales", money(642.350) + " BHD"], ["Cash counted", money(countedTotal) + " BHD"], ["Cash difference", (diff < 0 ? "−" : "") + money(Math.abs(diff)) + " BHD"], ["Cash out total", money(59.5) + " BHD"]].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
                  <span style={{ fontSize: 14.5, color: RUSH.ink2 }}>{r[0]}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 600, fontFamily: RUSH.mono, color: RUSH.ink }}>{r[1]}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* sticky footer nav */}
      <div style={{ position: "sticky", bottom: 0, display: "flex", gap: 12, padding: "16px 22px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${RUSH.line}` }}>
        <Btn kind="secondary" size="lg" onClick={prev} style={{ flex: "0 0 auto", minWidth: 120 }}>{step === 0 ? "Cancel" : "Back"}</Btn>
        {step < 5
          ? <Btn kind="primary" size="lg" full onClick={next} icon="chevron">Continue</Btn>
          : <Btn kind="primary" size="lg" full onClick={() => setDone(true)} icon="check">Submit Daily Closing</Btn>}
      </div>
    </div>
  );
}

/* ---------- Worker Home ---------- */
function WorkerHome({ go }) {
  const cl = D.checklist;
  const doneCount = cl.filter((c) => c.done).length;
  const actions = [
    { id: "alerts", label: "Inventory Alerts", icon: "bell", desc: "Low, expiring & expired items" },
    { id: "purchase", label: "Record Supplier Purchase", icon: "receive", desc: "Delivery or purchase received" },
    { id: "opened", label: "Mark Item Opened", icon: "clock", desc: "Start after-opening use-by" },
    { id: "waste", label: "Record Waste", icon: "trash", desc: "Log spoiled or damaged items" },
    { id: "cashout", label: "Cash Out from Register", icon: "cash", desc: "Purchases, expenses, withdrawals" },
    { id: "count", label: "Inventory Count", icon: "count", desc: "Monthly full stock count" },
  ];
  return (
    <div style={{ padding: "22px 22px 40px" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: RUSH.ink, letterSpacing: -0.4 }}>Good evening, Sara</div>
        <div style={{ fontSize: 14.5, color: RUSH.ink3, marginTop: 3 }}>Saturday, 14 June 2026 · Closing shift</div>
      </div>

      {/* Checklist */}
      <Card style={{ marginBottom: 18 }} pad={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${RUSH.line2}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: RUSH.ink }}>Today's Closing Checklist</div>
          <Badge color={RUSH.navy} bg={RUSH.bg}>{doneCount}/{cl.length} done</Badge>
        </div>
        {cl.map((c, i) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 18px", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, border: `1.5px solid ${c.done ? RUSH.green : RUSH.line}`, background: c.done ? RUSH.green : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {c.done && <Icon name="check" size={16} color="#fff" strokeWidth={2.6} />}
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: c.done ? RUSH.ink3 : RUSH.ink, textDecoration: c.done ? "line-through" : "none" }}>{c.label}</span>
          </div>
        ))}
      </Card>

      <Btn kind="primary" size="xl" full icon="checklist" onClick={() => go("closing")} style={{ marginBottom: 18, boxShadow: "0 6px 18px rgba(30,58,99,0.22)" }}>Start Daily Closing</Btn>

      <div style={{ fontSize: 13, fontWeight: 700, color: RUSH.ink3, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>Quick Actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {actions.map((a) => (
          <button key={a.id} onClick={() => go(a.id)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${RUSH.line}`, borderRadius: 16, padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, minHeight: 130 }}>
            <div style={{ width: 50, height: 50, borderRadius: 13, background: RUSH.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={a.icon} size={26} color={RUSH.navy} strokeWidth={1.9} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: RUSH.ink }}>{a.label}</div>
              <div style={{ fontSize: 13, color: RUSH.ink3, marginTop: 3, lineHeight: 1.4 }}>{a.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkerApp() {
  const [screen, setScreen] = useState("home");
  const go = (s) => setScreen(s);
  const home = () => setScreen("home");
  return (
    <div style={{ fontFamily: RUSH.sans, color: RUSH.ink, minHeight: "100%", background: RUSH.bg }}>
      {/* Navy top bar */}
      <div style={{ background: RUSH.navy, padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo light />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>Sara A.</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>Barista · Tablet</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 999, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={20} color="#fff" /></div>
        </div>
      </div>
      {screen === "home" && <WorkerHome go={go} />}
      {screen === "closing" && <ClosingWizard onExit={home} />}
      {screen === "alerts" && <WorkerAlertsScreen onExit={home} />}
      {screen === "purchase" && <SupplierPurchaseScreen onExit={home} />}
      {screen === "opened" && <MarkOpenedScreen onExit={home} />}
      {screen === "waste" && <WasteScreen onExit={home} />}
      {screen === "receive" && <ReceiveScreen onExit={home} />}
      {screen === "cashout" && <CashOutScreen onExit={home} />}
      {screen === "count" && <CountScreen onExit={home} />}
    </div>
  );
}
window.WorkerApp = WorkerApp;
