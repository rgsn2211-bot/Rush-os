/* Rush OS — Worker action screens: Waste, Receive, Cash Out, Inventory Count. */
const { useState: useStateW2 } = React;
const DW = window.RushData;

/* ---------- Record Waste (multi-line) ---------- */
function WasteScreen({ onExit }) {
  const [lines, setLines] = useState([{ id: 1, type: "Inventory item", name: "", qty: "", unit: "ml", reason: "Spoiled" }]);
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState(false);
  const [done, setDone] = useState(false);
  const itemNames = DW.inventory.map((i) => i.name);
  const products = DW.products.map((p) => p.name);
  const units = ["ml", "L", "g", "kg", "pc", "serving", "box"];

  const add = () => setLines([...lines, { id: Date.now(), type: "Inventory item", name: "", qty: "", unit: "pc", reason: "Spoiled" }]);
  const upd = (id, k, v) => setLines(lines.map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const rm = (id) => setLines(lines.length > 1 ? lines.filter((l) => l.id !== id) : lines);

  if (done) return (<div><WorkerSubHeader title="Record Waste" onBack={onExit} /><SuccessView title="Waste recorded" sub={`${lines.length} item${lines.length > 1 ? "s" : ""} logged. The owner will see this in Waste review.`} onDone={onExit} /></div>);

  return (
    <div style={{ paddingBottom: 100 }}>
      <WorkerSubHeader title="Record Waste" sub="Add one or more wasted items" onBack={onExit} right={<Pill kind="warning">{lines.length} item{lines.length > 1 ? "s" : ""}</Pill>} />
      <div style={{ padding: "18px 22px" }}>
        {lines.map((l, idx) => (
          <Card key={l.id} style={{ marginBottom: 14 }} pad={16}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: RUSH.navy }}>Item {idx + 1}</div>
              {lines.length > 1 && <button onClick={() => rm(l.id)} style={{ background: "none", border: "none", color: RUSH.red, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}><Icon name="trash" size={17} />Remove</button>}
            </div>
            {/* type toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["Inventory item", "Finished product"].map((t) => (
                <button key={t} onClick={() => upd(l.id, "type", t)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${l.type === t ? RUSH.navy : RUSH.line}`, background: l.type === t ? RUSH.navy : "#fff", color: l.type === t ? "#fff" : RUSH.ink2, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
            <Field label="Item name" style={{ marginBottom: 12 }}><Select big value={l.name || "Select item…"} onChange={(e) => upd(l.id, "name", e.target.value)} options={["Select item…", ...(l.type === "Inventory item" ? itemNames : products)]} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Quantity"><Input big mono value={l.qty} placeholder="0" onChange={(e) => upd(l.id, "qty", e.target.value)} /></Field>
              <Field label="Unit"><Select big value={l.unit} onChange={(e) => upd(l.id, "unit", e.target.value)} options={units} /></Field>
            </div>
            <Field label="Reason"><Select big value={l.reason} onChange={(e) => upd(l.id, "reason", e.target.value)} options={DW.wasteReasons} /></Field>
          </Card>
        ))}
        <Btn kind="secondary" size="lg" full icon="plus" onClick={add} style={{ borderStyle: "dashed", marginBottom: 18 }}>Add waste item</Btn>

        <Field label="Note" hint="optional" style={{ marginBottom: 14 }}><Input big value={note} placeholder="e.g. fridge left open overnight" onChange={(e) => setNote(e.target.value)} /></Field>
        <Field label="Photo" hint="optional" style={{ marginBottom: 14 }}><DropZone icon="camera" label="Add photo" done={photo} onClick={() => setPhoto(true)} height={100} /></Field>
        <Field label="Worker PIN"><Input big mono type="password" value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value)} /></Field>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "16px 22px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${RUSH.line}` }}>
        <Btn kind="primary" size="lg" full icon="check" onClick={() => setDone(true)}>Submit Waste Entry</Btn>
      </div>
    </div>
  );
}
window.WasteScreen = WasteScreen;

/* ---------- Receive Inventory ---------- */
function ReceiveScreen({ onExit }) {
  const [mode, setMode] = useState("supplier");
  const [lines, setLines] = useState([{ id: 1, name: "", qty: "", unit: "case" }]);
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(false);
  const [photo, setPhoto] = useState(false);
  const itemNames = DW.inventory.map((i) => i.name);
  const add = () => setLines([...lines, { id: Date.now(), name: "", qty: "", unit: "case" }]);
  const upd = (id, k, v) => setLines(lines.map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const rm = (id) => setLines(lines.length > 1 ? lines.filter((l) => l.id !== id) : lines);

  const newCount = lines.filter((l) => l.isNew && l.name).length;
  if (done) return (<div><WorkerSubHeader title="Receive Inventory" onBack={onExit} /><SuccessView title={mode === "supplier" ? "Delivery received" : "Cash purchase logged"} sub={(mode === "supplier" ? "Stock updated. The owner can review/enter costs later." : "Marked for owner review with receipt.") + (newCount ? ` ${newCount} new item${newCount > 1 ? "s" : ""} flagged for owner review.` : "")} onDone={onExit} /></div>);

  return (
    <div style={{ paddingBottom: 100 }}>
      <WorkerSubHeader title="Receive Inventory" onBack={onExit} />
      <div style={{ padding: "18px 22px" }}>
        {/* mode toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[["supplier", "Supplier delivery", "receive"], ["cash", "Cash purchase", "cash"]].map(([m, label, ic]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1.5px solid ${mode === m ? RUSH.navy : RUSH.line}`, background: mode === m ? RUSH.navy : "#fff", color: mode === m ? "#fff" : RUSH.ink2, fontWeight: 600, fontSize: 14.5, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Icon name={ic} size={24} color={mode === m ? "#fff" : RUSH.navy} />{label}
            </button>
          ))}
        </div>

        {mode === "cash" && <div style={{ marginBottom: 16, display: "flex", gap: 11, padding: 13, background: RUSH.amberBg, borderRadius: 12, alignItems: "flex-start" }}>
          <Icon name="alert" size={20} color={RUSH.amber} /><div style={{ fontSize: 13.5, color: RUSH.ink2, lineHeight: 1.5 }}>Cash purchases are <b>marked for owner review</b>. Add cost and a receipt photo.</div></div>}

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
                  <Field label="Category"><Select big value={l.cat || DW.categories[0]} onChange={(e) => upd(l.id, "cat", e.target.value)} options={DW.categories} /></Field>
                </div>
                <div style={{ marginTop: 10, fontSize: 12.5, color: RUSH.ink2 }}>Usable immediately. Owner completes units, cost &amp; settings later.</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Qty received"><Input big mono value={l.qty} placeholder="0" onChange={(e) => upd(l.id, "qty", e.target.value)} /></Field>
              <Field label="Purchase unit"><Select big value={l.unit} onChange={(e) => upd(l.id, "unit", e.target.value)} options={["case", "kg", "box", "tray", "tin", "pack", "btl"]} /></Field>
            </div>
            {mode === "cash" && <div style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Cost (BHD)"><Input big mono value={l.cost || ""} placeholder="0.000" onChange={(e) => upd(l.id, "cost", e.target.value)} /></Field>
                <Field label="Reason"><Input big value={l.reason || ""} placeholder="e.g. emergency buy" onChange={(e) => upd(l.id, "reason", e.target.value)} /></Field>
              </div>
            </div>}
          </Card>
        ))}
        <Btn kind="secondary" size="lg" full icon="plus" onClick={add} style={{ borderStyle: "dashed", marginBottom: 18 }}>Add item</Btn>

        {mode === "cash" && <Field label="Receipt photo" hint="required for cash buys" style={{ marginBottom: 14 }}><DropZone icon="camera" label="Add receipt photo" done={photo} onClick={() => setPhoto(true)} height={100} /></Field>}
        <Field label="Worker PIN"><Input big mono type="password" value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value)} /></Field>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "16px 22px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${RUSH.line}` }}>
        <Btn kind="primary" size="lg" full icon="check" onClick={() => setDone(true)}>{mode === "supplier" ? "Confirm Delivery" : "Submit Cash Purchase"}</Btn>
      </div>
    </div>
  );
}
window.ReceiveScreen = ReceiveScreen;

/* ---------- Cash Out from Register ---------- */
function CashOutScreen({ onExit }) {
  const [type, setType] = useState("Inventory purchase");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState(false);
  const [done, setDone] = useState(false);
  const types = ["Inventory purchase", "General expense", "Owner withdrawal", "Other"];
  const catOptions = {
    "Inventory purchase": ["Coffee", "Dairy", "Packaging", "Bakery", "Syrups", "Other"],
    "General expense": ["Utilities", "Maintenance", "Cleaning", "Marketing", "Transport", "Other"],
    "Owner withdrawal": ["Ahmed (Owner)", "Layla (Owner)"],
    "Other": ["Miscellaneous"],
  };
  if (done) return (<div><WorkerSubHeader title="Cash Out from Register" onBack={onExit} /><SuccessView title="Cash out recorded" sub="Saved to today's register log. It will appear in the owner's review & alerts." items={[["Type", type], ["Amount", money(parseFloat(amount) || 0) + " BHD"]]} onDone={onExit} /></div>);

  return (
    <div style={{ paddingBottom: 100 }}>
      <WorkerSubHeader title="Cash Out from Register" sub="Money taken out of the drawer" onBack={onExit} />
      <div style={{ padding: "18px 22px" }}>
        <Field label="Amount (BHD)" style={{ marginBottom: 18 }}>
          <Input big mono value={amount} placeholder="0.000" onChange={(e) => setAmount(e.target.value)} style={{ fontSize: 28, textAlign: "center", padding: "20px" }} />
        </Field>
        <div style={{ fontSize: 13, fontWeight: 600, color: RUSH.ink2, marginBottom: 8 }}>Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {types.map((t) => (
            <button key={t} onClick={() => { setType(t); setCat(""); }} style={{ padding: "15px 12px", borderRadius: 12, border: `1.5px solid ${type === t ? RUSH.navy : RUSH.line}`, background: type === t ? RUSH.navy : "#fff", color: type === t ? "#fff" : RUSH.ink2, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        <Field label={type === "Owner withdrawal" ? "Person" : "Category"} style={{ marginBottom: 14 }}>
          <Select big value={cat || "Select…"} onChange={(e) => setCat(e.target.value)} options={["Select…", ...catOptions[type]]} />
        </Field>
        <Field label="Note" hint="optional" style={{ marginBottom: 14 }}><Input big value={note} placeholder="What was this for?" onChange={(e) => setNote(e.target.value)} /></Field>
        <Field label="Receipt / photo" hint="optional" style={{ marginBottom: 14 }}><DropZone icon="camera" label="Add receipt photo" done={photo} onClick={() => setPhoto(true)} height={100} /></Field>
        <Field label="Worker PIN"><Input big mono type="password" value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value)} /></Field>
        <div style={{ marginTop: 14, display: "flex", gap: 10, padding: 12, background: RUSH.bg, borderRadius: 10, alignItems: "center" }}>
          <Icon name="clock" size={18} color={RUSH.ink3} /><div style={{ fontSize: 13, color: RUSH.ink3 }}>Saves immediately. No approval needed now — owner reviews it later.</div>
        </div>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "16px 22px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${RUSH.line}` }}>
        <Btn kind="primary" size="lg" full icon="check" onClick={() => setDone(true)}>Record Cash Out</Btn>
      </div>
    </div>
  );
}
window.CashOutScreen = CashOutScreen;

/* ---------- Inventory Count ---------- */
function CountScreen({ onExit }) {
  const [counts, setCounts] = useState({});
  const [done, setDone] = useState(false);
  const items = DW.inventory;
  const counted = Object.keys(counts).filter((k) => counts[k] !== "").length;
  if (done) return (<div><WorkerSubHeader title="Inventory Count" onBack={onExit} /><SuccessView title="Count submitted" sub="Your monthly count was sent to the owner. Variances will be reviewed before stock is adjusted." onDone={onExit} /></div>);

  return (
    <div style={{ paddingBottom: 100 }}>
      <WorkerSubHeader title="Inventory Count" sub="Monthly full count · June 2026" onBack={onExit} right={<Badge color={RUSH.navy} bg={RUSH.bg}>{counted}/{items.length}</Badge>} />
      <div style={{ padding: "18px 22px" }}>
        <div style={{ marginBottom: 16, display: "flex", gap: 11, padding: 13, background: RUSH.blueBg, borderRadius: 12, alignItems: "flex-start" }}>
          <Icon name="alert" size={20} color={RUSH.blue} /><div style={{ fontSize: 13.5, color: RUSH.ink2, lineHeight: 1.5 }}>Count what's physically on the shelf in the <b>base unit</b>. The owner reviews variances before stock updates.</div>
        </div>
        <Card pad={0}>
          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: RUSH.ink }}>{it.name}</div>
                <div style={{ fontSize: 12.5, color: RUSH.ink3 }}>System: {it.stock} {it.base} · {it.cat}</div>
              </div>
              <input value={counts[it.id] ?? ""} onChange={(e) => setCounts({ ...counts, [it.id]: e.target.value })} placeholder="count"
                style={{ width: 86, padding: "11px 12px", fontSize: 16, fontFamily: RUSH.mono, fontWeight: 600, textAlign: "center", border: `1px solid ${RUSH.line}`, borderRadius: 10, outline: "none" }} />
              <div style={{ width: 28, fontSize: 13, color: RUSH.ink3, fontWeight: 600 }}>{it.base}</div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "16px 22px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${RUSH.line}` }}>
        <Btn kind="primary" size="lg" full icon="check" onClick={() => setDone(true)}>Submit Count</Btn>
      </div>
    </div>
  );
}
window.CountScreen = CountScreen;
