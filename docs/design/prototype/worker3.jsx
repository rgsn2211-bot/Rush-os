/* Rush OS — Worker: Record Supplier Purchase (invoice), Inventory Alerts (view-only), Mark Item Opened. */
const { useState: useStateW3 } = React;
const DW3 = window.RushData;

/* ---------- Record Supplier Purchase ---------- */
function SupplierPurchaseScreen({ onExit }) {
  const [paid, setPaid] = useState("Unpaid");
  const [method, setMethod] = useState("Cash register");
  const [supplier, setSupplier] = useState("Select supplier…");
  const [lines, setLines] = useState([{ id: 1, name: "", qty: "", unit: "case", cost: "", expiry: "" }]);
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState(false);
  const [done, setDone] = useState(false);
  const itemNames = DW3.inventory.map((i) => i.name);
  const add = () => setLines([...lines, { id: Date.now(), name: "", qty: "", unit: "case", cost: "", expiry: "" }]);
  const upd = (id, k, v) => setLines(lines.map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const rm = (id) => setLines(lines.length > 1 ? lines.filter((l) => l.id !== id) : lines);
  const lineTotal = (l) => (parseFloat(l.qty) || 0) * (parseFloat(l.cost) || 0);
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
  const newCount = lines.filter((l) => l.isNew && l.name).length;

  if (done) return (
    <div><WorkerSubHeader title="Record Supplier Purchase" onBack={onExit} />
      <SuccessView title="Purchase recorded" sub={"Inventory updated. Owner review required." + (paid === "Unpaid" ? " Marked unpaid — added to the owner's payables." : "") + (newCount ? ` ${newCount} new item${newCount > 1 ? "s" : ""} flagged for review.` : "")}
        items={[["Supplier", supplier === "Select supplier…" ? "—" : supplier], ["Items", String(lines.length)], ["Total", money(total) + " BHD"], ["Payment", paid === "Paid" ? `Paid · ${method}` : "Unpaid"]]} onDone={onExit} />
    </div>
  );

  return (
    <div style={{ paddingBottom: 100 }}>
      <WorkerSubHeader title="Record Supplier Purchase" sub="Log a delivery or purchase that already happened" onBack={onExit} right={<Pill kind={paid === "Paid" ? "ok" : "warning"}>{paid}</Pill>} />
      <div style={{ padding: "18px 22px" }}>
        <div style={{ marginBottom: 16, display: "flex", gap: 11, padding: 13, background: RUSH.blueBg, borderRadius: 12, alignItems: "flex-start" }}>
          <Icon name="alert" size={20} color={RUSH.blue} /><div style={{ fontSize: 13.5, color: RUSH.ink2, lineHeight: 1.5 }}>Recording a purchase <b>increases stock immediately</b> and sends it to the owner for review. You are not ordering from the supplier here.</div>
        </div>

        {/* header */}
        <Card pad={16} style={{ marginBottom: 16 }}>
          <Field label="Supplier" style={{ marginBottom: 12 }}><Select big value={supplier} onChange={(e) => setSupplier(e.target.value)} options={["Select supplier…", ...DW3.suppliers]} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Purchase date"><Input big mono value="14 Jun 2026" onChange={() => {}} /></Field>
            <Field label="Payment"><Select big value={paid} onChange={(e) => setPaid(e.target.value)} options={["Unpaid", "Paid"]} /></Field>
          </div>
          {paid === "Paid"
            ? <Field label="Payment method"><Select big value={method} onChange={(e) => setMethod(e.target.value)} options={["Cash register", "Card", "BenefitPay", "Paid by owner"]} /></Field>
            : <Field label="Due date"><Input big mono value="" placeholder="e.g. 21 Jun 2026" onChange={() => {}} /></Field>}
        </Card>

        {/* line items */}
        {lines.map((l, idx) => (
          <Card key={l.id} style={{ marginBottom: 14 }} pad={16}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: RUSH.navy }}>Item {idx + 1}</div>
              {lines.length > 1 && <button onClick={() => rm(l.id)} style={{ background: "none", border: "none", color: RUSH.red, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}><Icon name="trash" size={17} />Remove</button>}
            </div>
            {!l.isNew ? (
              <Field label="Item" style={{ marginBottom: 12 }}>
                <Select big value={l.name || "Select item…"} onChange={(e) => { const v = e.target.value; if (v === "➕ Create new item…") { upd(l.id, "isNew", true); upd(l.id, "name", ""); } else upd(l.id, "name", v); }} options={["Select item…", ...itemNames, "➕ Create new item…"]} />
              </Field>
            ) : (
              <div style={{ marginBottom: 12, padding: 14, background: RUSH.amberBg, borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: RUSH.amber, display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={16} color={RUSH.amber} />New item · needs owner review</span>
                  <button onClick={() => { upd(l.id, "isNew", false); upd(l.id, "name", ""); }} style={{ background: "none", border: "none", color: RUSH.ink3, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Use existing</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="New item name"><Input big value={l.name} placeholder="e.g. Caramel Syrup" onChange={(e) => upd(l.id, "name", e.target.value)} /></Field>
                  <Field label="Main category"><Select big value={l.cat || DW3.mainCategories[0]} onChange={(e) => upd(l.id, "cat", e.target.value)} options={DW3.mainCategories} /></Field>
                </div>
                <div style={{ marginTop: 10, fontSize: 12.5, color: RUSH.ink2 }}>Usable immediately. Owner completes units, cost &amp; settings later.</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Qty received"><Input big mono value={l.qty} placeholder="0" onChange={(e) => upd(l.id, "qty", e.target.value)} /></Field>
              <Field label="Purchase unit"><Select big value={l.unit} onChange={(e) => upd(l.id, "unit", e.target.value)} options={["case", "kg", "box", "tray", "tin", "pack", "btl", "pc"]} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Unit cost (BHD)"><Input big mono value={l.cost} placeholder="0.000" onChange={(e) => upd(l.id, "cost", e.target.value)} /></Field>
              <Field label="Expiry date" hint="if applicable"><Input big mono value={l.expiry} placeholder="dd mmm" onChange={(e) => upd(l.id, "expiry", e.target.value)} /></Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${RUSH.line2}` }}>
              <span style={{ fontSize: 13, color: RUSH.ink3, fontWeight: 600 }}>Line total</span>
              <span style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 15 }}>{money(lineTotal(l))} BHD</span>
            </div>
          </Card>
        ))}
        <Btn kind="secondary" size="lg" full icon="plus" onClick={add} style={{ borderStyle: "dashed", marginBottom: 16 }}>Add item</Btn>

        <Card pad={16} style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", background: RUSH.bg }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Purchase total</span>
          <span style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 18 }}>{money(total)} BHD</span>
        </Card>

        <Field label={paid === "Unpaid" ? "Invoice photo" : "Receipt photo"} hint="recommended" style={{ marginBottom: 14 }}><DropZone icon="camera" label={`Add ${paid === "Unpaid" ? "invoice" : "receipt"} photo`} done={photo} onClick={() => setPhoto(true)} height={100} /></Field>
        <Field label="Notes" hint="optional" style={{ marginBottom: 14 }}><Input big value="" placeholder="Anything to note for the owner" onChange={() => {}} /></Field>
        <Field label="Worker PIN"><Input big mono type="password" value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value)} /></Field>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "16px 22px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${RUSH.line}` }}>
        <Btn kind="primary" size="lg" full icon="check" onClick={() => setDone(true)}>Record Purchase</Btn>
      </div>
    </div>
  );
}
window.SupplierPurchaseScreen = SupplierPurchaseScreen;

/* ---------- Worker Inventory Alerts (view-only) ---------- */
function WorkerAlertsScreen({ onExit }) {
  const cfg = {
    low: { c: RUSH.amber, bg: RUSH.amberBg, icon: "box", label: "Low Stock" },
    expiring: { c: RUSH.amber, bg: RUSH.amberBg, icon: "clock", label: "Expiring Soon" },
    expired: { c: RUSH.red, bg: RUSH.redBg, icon: "alert", label: "Expired" },
    out: { c: RUSH.red, bg: RUSH.redBg, icon: "alert", label: "Out of Stock" },
  };
  return (
    <div style={{ paddingBottom: 40 }}>
      <WorkerSubHeader title="Inventory Alerts" sub="What to watch on the shelf today" onBack={onExit} right={<Pill kind="warning">{DW3.workerInvAlerts.length}</Pill>} />
      <div style={{ padding: "18px 22px" }}>
        <div style={{ marginBottom: 16, display: "flex", gap: 11, padding: 13, background: RUSH.bg, borderRadius: 12, alignItems: "flex-start" }}>
          <Icon name="alert" size={20} color={RUSH.ink3} /><div style={{ fontSize: 13.5, color: RUSH.ink3, lineHeight: 1.5 }}>View only. Tell the owner — they decide on restocking and orders.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DW3.workerInvAlerts.map((a, i) => {
            const c = cfg[a.status] || cfg.low;
            return (
              <Card key={i} pad={16} style={{ display: "flex", alignItems: "center", gap: 14, borderLeft: `4px solid ${c.c}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={c.icon} size={24} color={c.c} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{a.item}</div>
                  <div style={{ fontSize: 13.5, color: RUSH.ink2, marginTop: 2 }}>{a.qty} left{a.expiry ? ` · expires ${a.expiry}` : a.days ? ` · ~${a.days} day${a.days > 1 ? "s" : ""} left` : ""}</div>
                  <div style={{ fontSize: 12.5, color: RUSH.ink3, marginTop: 4 }}>{a.msg}</div>
                </div>
                <span style={{ display: "inline-block", padding: "4px 11px", borderRadius: 999, background: c.bg, color: c.c, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{c.label}</span>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.WorkerAlertsScreen = WorkerAlertsScreen;

/* ---------- Mark Item as Opened ---------- */
function MarkOpenedScreen({ onExit }) {
  const [name, setName] = useState("Select item…");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("L");
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(false);
  const trackable = DW3.inventory.filter((i) => i.trackOpen);
  const sel = DW3.inventory.find((i) => i.name === name);
  const openDays = sel?.openDays;
  // mock use-by = 14 Jun + openDays
  const useBy = openDays ? new Date(2026, 5, 14 + openDays).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";

  if (done) return (<div><WorkerSubHeader title="Mark Item Opened" onBack={onExit} /><SuccessView title="Item marked opened" sub="The use-by clock has started. Owner can review the opened record." items={[["Item", name], ["Opened qty", `${qty || 0} ${unit}`], ["Use within", openDays ? `${openDays} days` : "—"], ["Use-by", useBy]]} onDone={onExit} /></div>);

  return (
    <div style={{ paddingBottom: 100 }}>
      <WorkerSubHeader title="Mark Item Opened" sub="Start the after-opening use-by clock" onBack={onExit} />
      <div style={{ padding: "18px 22px" }}>
        <div style={{ marginBottom: 16, display: "flex", gap: 11, padding: 13, background: RUSH.blueBg, borderRadius: 12, alignItems: "flex-start" }}>
          <Icon name="alert" size={20} color={RUSH.blue} /><div style={{ fontSize: 13.5, color: RUSH.ink2, lineHeight: 1.5 }}>The system uses the <b>oldest available batch</b> automatically — you don't need to pick one.</div>
        </div>
        <Field label="Item" hint="opening-tracked only" style={{ marginBottom: 14 }}>
          <Select big value={name} onChange={(e) => { setName(e.target.value); const it = DW3.inventory.find((i) => i.name === e.target.value); if (it) setUnit(it.base); }} options={["Select item…", ...trackable.map((i) => i.name)]} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <Field label="Quantity opened"><Input big mono value={qty} placeholder="0" onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Unit"><Select big value={unit} onChange={(e) => setUnit(e.target.value)} options={DW3.baseUnits} /></Field>
        </div>
        {sel && (
          <Card pad={16} style={{ marginBottom: 14, background: RUSH.bg }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ fontSize: 13.5, color: RUSH.ink2 }}>Opened date</span><span style={{ fontSize: 13.5, fontWeight: 600, fontFamily: RUSH.mono }}>14 Jun 2026</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${RUSH.line2}` }}><span style={{ fontSize: 13.5, color: RUSH.ink2 }}>Use within</span><span style={{ fontSize: 13.5, fontWeight: 600 }}>{openDays} days</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${RUSH.line2}` }}><span style={{ fontSize: 13.5, color: RUSH.ink2 }}>Calculated use-by</span><span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: RUSH.mono, color: RUSH.amber }}>{useBy}</span></div>
          </Card>
        )}
        <Field label="Note" hint="optional" style={{ marginBottom: 14 }}><Input big value="" placeholder="optional" onChange={() => {}} /></Field>
        <Field label="Worker PIN"><Input big mono type="password" value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value)} /></Field>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "16px 22px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${RUSH.line}` }}>
        <Btn kind="primary" size="lg" full icon="check" onClick={() => setDone(true)}>Mark as Opened</Btn>
      </div>
    </div>
  );
}
window.MarkOpenedScreen = MarkOpenedScreen;
