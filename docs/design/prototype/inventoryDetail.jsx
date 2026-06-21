/* Rush OS — Owner Inventory detail + forms + shelf-life settings + opened items + audit + purchase review. */
const { useState: useStateID } = React;
const DID = window.RushData;

/* ============ ITEM DETAIL (decision view) ============ */
function ItemDetail({ item, onBack, onEdit, mobile }) {
  const [tab, setTab] = useState("history");
  const [period, setPeriod] = useState("30 Days");
  const needsReview = item.review === "Needs Review";
  const rec = DID.restockRecs[item.id];
  const batches = DID.batches[item.id] || [];
  const h = DID.itemHistory.default;
  const stockValue = item.stockValue || (item.stock * (item.official || 0));
  const nextExpiry = batches.length ? batches.reduce((a, b) => (a && a.effective < b.effective ? a : b)).effective : "—";

  const tabs = [
    { v: "history", label: "Stock History" },
    { v: "purchases", label: "Purchases" },
    { v: "usage", label: "Usage" },
    { v: "waste", label: "Waste" },
    { v: "batches", label: "Expiry Batches" },
    { v: "opened", label: "Opened Items" },
    { v: "restock", label: "Restock" },
    { v: "settings", label: "Settings" },
  ];

  const headStats = [
    ["Current stock", `${item.stock} ${item.base}`, item.status === "low" ? RUSH.red : RUSH.ink],
    ["Stock value", `${money(stockValue)}`, RUSH.ink],
    ["Avg cost", `${money(item.avg || 0)}`, RUSH.ink2],
    ["Latest cost", `${money(item.latest || 0)}`, RUSH.ink2],
    ["Avg daily usage", `${item.avgDaily} ${item.base}`, RUSH.ink],
    ["Days remaining", `${item.days}d`, item.days <= 3 ? RUSH.red : RUSH.ink],
    ["Stockout date", item.stockoutDate || "—", RUSH.ink],
    ["Next expiry", nextExpiry, nextExpiry === "—" ? RUSH.ink3 : RUSH.amber],
  ];

  return (
    <div>
      <BackLink onClick={onBack}>Back to inventory</BackLink>
      <PageHead title={item.name} sub={`${item.mainCat || item.cat} · ${item.supplier}`}
        right={<div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{needsReview && <ReviewChip />}<RestockTag r={item.restock} /><Btn kind="secondary" icon="settings" onClick={onEdit}>Edit</Btn></div>} />

      {needsReview && (
        <div style={{ display: "flex", gap: 12, padding: 16, background: RUSH.amberBg, borderRadius: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <Icon name="alert" size={22} color={RUSH.amber} />
          <div style={{ flex: 1, minWidth: 200, fontSize: 14, color: RUSH.ink2 }}><b>Created by a worker — needs your review.</b> Set official cost, units, reorder settings and shelf-life rule to complete it.</div>
          <Btn kind="primary" size="sm" icon="settings" onClick={onEdit}>Complete Setup</Btn>
        </div>
      )}

      {/* decision header */}
      <Card pad={18} style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 16 }}>
          {headStats.map(([l, v, c]) => (
            <div key={l}><div style={{ fontSize: 12, color: RUSH.ink3, fontWeight: 600 }}>{l}</div><div style={{ fontFamily: RUSH.mono, fontSize: 18, fontWeight: 700, color: c, marginTop: 4 }}>{v}</div></div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${RUSH.line2}`, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12.5, color: RUSH.ink3, fontWeight: 600 }}>Usage trend</span><TrendTag t={item.trend} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12.5, color: RUSH.ink3, fontWeight: 600 }}>Movement</span><MovementTag m={item.movement} size="sm" /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12.5, color: RUSH.ink3, fontWeight: 600 }}>Shelf-life</span><ShelfChip shelf={item.shelf} /></div>
        </div>
      </Card>

      {/* usage chart */}
      <Card pad={20} style={{ marginBottom: 16 }}>
        <SectionTitle right={<SegTabs size="sm" tabs={["7 Days", "30 Days", "90 Days", "Custom"]} value={period} onChange={setPeriod} />}>Usage</SectionTitle>
        <UsageChart data={item.usageHistory || [1, 2, 1, 3, 2, 4, 3]} period={period} />
      </Card>

      {/* section tabs */}
      <div style={{ overflowX: "auto", marginBottom: 16 }}><SegTabs tabs={tabs} value={tab} onChange={setTab} /></div>

      {tab === "history" && (
        <Card pad={0}><Table cols={[
          { h: "Date", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.date}</span> },
          { h: "Event", cell: (r) => <span style={{ fontWeight: 600 }}>{r.event}</span> },
          { h: "Change", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600, color: r.change.startsWith("+") ? RUSH.green : RUSH.red }}>{r.change}</span> },
          { h: "By", cell: (r) => <span style={{ color: RUSH.ink3 }}>{r.by}</span> },
        ]} rows={h.stockHistory} /></Card>
      )}
      {tab === "purchases" && (
        <Card pad={0}><Table cols={[
          { h: "Date", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.date}</span> },
          { h: "Supplier", cell: (r) => <span style={{ fontWeight: 600 }}>{r.supplier}</span> },
          { h: "Qty", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.qty}</span> },
          { h: "Cost", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{r.cost}</span> },
          { h: "Status", cell: (r) => <Pill kind="ok">{r.status}</Pill> },
        ]} rows={h.purchases} /></Card>
      )}
      {tab === "usage" && (
        <Card pad={0}><Table cols={[
          { h: "Date", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.date}</span> },
          { h: "Source", cell: (r) => <span style={{ fontWeight: 600 }}>{r.source}</span> },
          { h: "Qty", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.qty}</span> },
        ]} rows={h.usage} /></Card>
      )}
      {tab === "waste" && (
        <Card pad={0}><Table cols={[
          { h: "Date", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.date}</span> },
          { h: "Qty", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600, color: RUSH.red }}>{r.qty}</span> },
          { h: "Reason", cell: (r) => <Badge color={RUSH.ink2} bg={RUSH.bg}>{r.reason}</Badge> },
        ]} rows={h.waste} /></Card>
      )}
      {tab === "batches" && (
        batches.length ? <Card pad={0}><Table cols={[
          { h: "Received", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.received}</span> },
          { h: "Qty", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.remaining}/{r.qty}</span> },
          { h: "Printed expiry", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.printedExpiry}</span> },
          { h: "Opened", cell: (r) => <span style={{ color: RUSH.ink3 }}>{r.openedQty ? `${r.openedQty} · ${r.openedDate}` : "—"}</span> },
          { h: "Effective use-by", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{r.effective}</span> },
          { h: "Status", cell: (r) => <BatchStatus s={r.status} /> },
        ]} rows={batches} /></Card>
        : <Card pad={28} style={{ textAlign: "center", color: RUSH.ink3, fontSize: 14 }}>Expiry not tracked for this item ({item.expiry}).</Card>
      )}
      {tab === "opened" && (
        <Card pad={0}><Table cols={[
          { h: "Opened", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.openedDate}</span> },
          { h: "Qty", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.qty}</span> },
          { h: "Use within", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.useWithin}</span> },
          { h: "Use-by", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{r.useBy}</span> },
          { h: "Status", cell: (r) => <BatchStatus s={r.status} /> },
        ]} rows={DID.openedItems.filter((o) => o.item === item.name)} />
        {DID.openedItems.filter((o) => o.item === item.name).length === 0 && <div style={{ padding: 28, textAlign: "center", color: RUSH.ink3, fontSize: 14 }}>No open packs recorded.</div>}
        </Card>
      )}
      {tab === "restock" && (
        rec ? <Card pad={20}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><span style={{ fontSize: 16, fontWeight: 700 }}>Recommendation</span><RestockTag r={rec.status} /></div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 16 }}>
            <MiniStat label="Current coverage" value={rec.coverage} suffix="" sub={`stockout ${rec.stockout}`} />
            <MiniStat label="Lead + safety" value={`${rec.lead}+${rec.safety}d`} suffix="" />
            <MiniStat label="Incoming" value={rec.incoming} suffix="" />
            <MiniStat label="Suggested order" value={rec.suggested} suffix="" accent={RUSH.navy} />
            <MiniStat label="Stock after order" value={rec.after} suffix="" />
            <MiniStat label="Coverage after" value={rec.afterCov} suffix="" />
            <MiniStat label="Reorder by" value={rec.reorderBy} suffix="" />
          </div>
          <div style={{ display: "flex", gap: 9, padding: 12, background: RUSH.bg, borderRadius: 10, alignItems: "flex-start", marginTop: 16 }}>
            <Icon name="ai" size={16} color={RUSH.ink3} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>{rec.reason}</div>
          </div>
          {rec.warning && <div style={{ display: "flex", gap: 9, padding: 12, background: RUSH.amberBg, borderRadius: 10, alignItems: "flex-start", marginTop: 10 }}>
            <Icon name="alert" size={16} color={RUSH.amber} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}><b>Shelf-life protection:</b> {rec.warning}</div>
          </div>}
          <Btn kind="primary" icon="receive" style={{ marginTop: 16 }}>Create Reorder</Btn>
        </Card>
        : <Card pad={28} style={{ textAlign: "center", color: RUSH.ink3, fontSize: 14 }}>{item.movement === "New Item" ? "Not enough usage data yet for a recommendation." : "Healthy — no restock needed right now."}</Card>
      )}
      {tab === "settings" && (
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span style={{ fontSize: 16, fontWeight: 700 }}>Item Settings</span><Btn kind="secondary" size="sm" icon="settings" onClick={onEdit}>Edit</Btn></div>
          {[["Main category", item.mainCat || item.cat], ["Shelf-life group", item.shelf || "—"], ["Base unit", item.base], ["Purchase unit", item.purchaseUnit], ["Conversion", item.conv], ["Minimum stock", `${item.min} ${item.base}`], ["Safety days", `${item.safetyDays} days`], ["Supplier lead time", `${item.lead} days`], ["Max stock override", item.maxOverride ? `${item.maxOverride} ${item.base}` : "None"], ["Expiry rule", item.expiry], ["Track after opening", item.trackOpen ? `On · ${item.openDays} days` : "Off"], ["Official cost", money(item.official || 0)], ["Supplier", item.supplier], ["Status", item.active === false ? "Inactive" : "Active"]].map(([l, v], i) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
              <span style={{ fontSize: 13.5, color: RUSH.ink2 }}>{l}</span><span style={{ fontSize: 13.5, fontWeight: 600, color: RUSH.ink }}>{v}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
window.ItemDetail = ItemDetail;

function BatchStatus({ s }) {
  const map = {
    "Expires Tomorrow": { c: RUSH.red, bg: RUSH.redBg }, "Use Within 2 Days": { c: RUSH.amber, bg: RUSH.amberBg },
    "Expired": { c: RUSH.red, bg: RUSH.redBg }, "Opened Batch": { c: RUSH.blue, bg: RUSH.blueBg }, "OK": { c: RUSH.green, bg: RUSH.greenBg },
  };
  const cfg = map[s] || map.OK;
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, background: cfg.bg, color: cfg.c, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{s}</span>;
}
window.BatchStatus = BatchStatus;

/* ============ ITEM FORM (add / edit) ============ */
function ItemForm({ item, onBack, mobile }) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name || "");
  const [trackOpen, setTrackOpen] = useState(item?.trackOpen || false);
  return (
    <div>
      <BackLink onClick={onBack}>{isEdit ? "Back to item" : "Back to inventory"}</BackLink>
      <PageHead title={isEdit ? `Edit ${item.name}` : "Add Inventory Item"} sub={isEdit ? "Update details and settings" : "Start simple — open advanced sections only if needed"} />
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.6fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card pad={20}>
            <SectionTitle>Basics</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label="Item name"><Input value={name} placeholder="e.g. Fresh Milk" onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Main category"><Select value={item?.mainCat || DID.mainCategories[0]} onChange={() => {}} options={DID.mainCategories} /></Field>
              <Field label="Shelf-life group"><Select value={item?.shelf || "Medium Life"} onChange={() => {}} options={DID.shelfLifeGroups.map((g) => g.name)} /></Field>
              <Field label="Base unit" hint="how you count stock"><Select value={item?.base || "L"} onChange={() => {}} options={DID.baseUnits} /></Field>
              <Field label="Current stock"><Input mono value={item ? String(item.stock) : ""} placeholder="0" onChange={() => {}} /></Field>
              <Field label="Supplier"><Select value={item?.supplier || DID.suppliers[0]} onChange={() => {}} options={DID.suppliers} /></Field>
              <Field label="Status"><Select value={item?.active === false ? "Inactive" : "Active"} onChange={() => {}} options={["Active", "Inactive"]} /></Field>
            </div>
          </Card>

          <Collapsible title="Purchase unit & conversion" sub="How you buy vs. how you count" icon="box">
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
              <Field label="Purchase unit"><Input value={item?.purchaseUnit || ""} placeholder="case (12 L)" onChange={() => {}} /></Field>
              <Field label="Units per purchase"><Input mono value="12" onChange={() => {}} /></Field>
              <Field label="Conversion"><Input value={item?.conv || "1 case = 12 L"} onChange={() => {}} /></Field>
            </div>
          </Collapsible>
          <Collapsible title="Reorder settings" sub="Minimum stock, safety days, lead time, max override" icon="receive">
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label="Minimum stock" hint="base unit"><Input mono value={item ? String(item.min) : ""} placeholder="0" onChange={() => {}} /></Field>
              <Field label="Safety days"><Input mono value={item ? String(item.safetyDays) : "3"} onChange={() => {}} /></Field>
              <Field label="Supplier lead time" hint="days"><Input mono value={item ? String(item.lead) : "5"} onChange={() => {}} /></Field>
              <Field label="Max stock override" hint="optional"><Input mono value={item?.maxOverride ? String(item.maxOverride) : ""} placeholder="none" onChange={() => {}} /></Field>
            </div>
          </Collapsible>
          <Collapsible title="Expiry & opening" sub="Expiry tracking and after-opening lifetime" icon="clock">
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label="Expiry tracking"><Select value={item?.expiry || "Optional"} onChange={() => {}} options={["Required", "Optional", "Not needed"]} /></Field>
              <Field label="Expiry warning override" hint="days before"><Input mono value="Default (3)" onChange={() => {}} /></Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 4px", marginTop: 8, borderTop: `1px solid ${RUSH.line2}` }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>Track after opening</div><div style={{ fontSize: 12.5, color: RUSH.ink3 }}>For milk, syrups, sauces, fresh items</div></div>
              <Toggle on={trackOpen} onChange={setTrackOpen} />
            </div>
            {trackOpen && <Field label="Use within X days after opening" style={{ marginTop: 12 }}><Input mono value={item?.openDays ? String(item.openDays) : "3"} onChange={() => {}} /></Field>}
          </Collapsible>
          <Collapsible title="Cost settings" sub="Official cost & costing method" icon="tag">
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label="Official cost (per base unit)" hint="BHD"><Input mono value={item?.official ? String(item.official) : ""} placeholder="0.380" onChange={() => {}} /></Field>
              <Field label="Costing method"><Select value="Weighted average" onChange={() => {}} options={["Weighted average", "Latest purchase"]} /></Field>
            </div>
            <div style={{ marginTop: 12, fontSize: 12.5, color: RUSH.ink3 }}>Recipes & COGS use the confirmed weighted-average cost.</div>
          </Collapsible>
          <Collapsible title="Notes" icon="receipt"><Field label="Internal note"><Input value="" placeholder="Anything to remember about this item" onChange={() => {}} /></Field></Collapsible>
        </div>

        <Card pad={20} style={{ position: mobile ? "static" : "sticky", top: 84 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{isEdit ? "Save changes" : "Create item"}</div>
          <div style={{ fontSize: 13, color: RUSH.ink3, lineHeight: 1.5, marginBottom: 16 }}>{isEdit ? "Updates apply immediately to inventory and recipes." : "You can save with just the basics and fill in advanced settings later."}</div>
          <Btn kind="primary" full size="lg" icon="check" onClick={onBack}>{isEdit ? "Save Item" : "Create Item"}</Btn>
          <Btn kind="ghost" full style={{ marginTop: 8 }} onClick={onBack}>Cancel</Btn>
        </Card>
      </div>
    </div>
  );
}
window.ItemForm = ItemForm;

/* ============ SHELF-LIFE GROUP SETTINGS ============ */
function ShelfLifeSettings({ onBack, mobile }) {
  return (
    <div>
      <BackLink onClick={onBack}>Back to inventory</BackLink>
      <PageHead title="Shelf-Life Group Settings" sub="Edit the day ranges that define each shelf-life group" />
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        {DID.shelfLifeGroups.map((g) => (
          <Card key={g.id} pad={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: SHELF_COLOR[g.name] }} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>{g.name}</span>
            </div>
            {g.id === "none" ? (
              <div style={{ fontSize: 13.5, color: RUSH.ink3 }}>No expiry tracking. Used for packaging, cups and cleaning supplies.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Min days"><Input mono value={String(g.min)} onChange={() => {}} /></Field>
                <Field label="Max days"><Input mono value={String(g.max)} onChange={() => {}} /></Field>
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12.5, color: RUSH.ink3 }}>{g.note}</div>
          </Card>
        ))}
      </div>
      <Btn kind="primary" icon="check" style={{ marginTop: 18 }} onClick={onBack}>Save Groups</Btn>
    </div>
  );
}
window.ShelfLifeSettings = ShelfLifeSettings;

/* ============ OPENED ITEMS VIEW ============ */
function OpenedItemsView({ onBack, mobile }) {
  return (
    <div>
      <BackLink onClick={onBack}>Back to inventory</BackLink>
      <PageHead title="Opened Items" sub="Open packs tracked by use-by date · oldest batch used first" />
      {mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DID.openedItems.map((o) => (
            <Card key={o.id} pad={16}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div><div style={{ fontSize: 15.5, fontWeight: 700 }}>{o.item}</div><div style={{ fontSize: 12.5, color: RUSH.ink3, marginTop: 2 }}>{o.qty} · opened {o.openedDate}</div></div>
                <BatchStatus s={o.status} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, color: RUSH.ink2 }}><span>Use within <b>{o.useWithin}</b></span><span>Use-by <b style={{ fontFamily: RUSH.mono }}>{o.useBy}</b></span></div>
            </Card>
          ))}
        </div>
      ) : (
        <Card pad={0}><Table cols={[
          { h: "Item", cell: (r) => <span style={{ fontWeight: 600 }}>{r.item}</span> },
          { h: "Opened qty", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono }}>{r.qty}</span> },
          { h: "Opened", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.openedDate}</span> },
          { h: "Use within", cell: (r) => <span style={{ color: RUSH.ink2 }}>{r.useWithin}</span> },
          { h: "Effective use-by", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{r.effective}</span> },
          { h: "By", cell: (r) => <span style={{ color: RUSH.ink3 }}>{r.by}</span> },
          { h: "Status", cell: (r) => <BatchStatus s={r.status} /> },
        ]} rows={DID.openedItems} /></Card>
      )}
    </div>
  );
}
window.OpenedItemsView = OpenedItemsView;

/* ============ AUDIT HISTORY ============ */
function AuditHistory({ onBack, mobile }) {
  return (
    <div>
      <BackLink onClick={onBack}>Back</BackLink>
      <PageHead title="Audit History" sub="Owner actions, edits and voided records" />
      <Card pad={0}>
        {DID.auditHistory.map((a, i) => (
          <div key={a.id} style={{ padding: "16px 20px", borderTop: i ? `1px solid ${RUSH.line2}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>{a.action}</span>
              <Badge color={a.ownerAction === "Void Purchase" ? RUSH.red : RUSH.ink2} bg={a.ownerAction === "Void Purchase" ? RUSH.redBg : RUSH.bg}>{a.ownerAction}</Badge>
              <span style={{ fontSize: 12.5, color: RUSH.ink3 }}>{a.supplier !== "—" ? a.supplier : ""}</span>
            </div>
            <div style={{ fontSize: 13, color: RUSH.ink2, marginTop: 5 }}>{a.edited}</div>
            {a.reason !== "—" && <div style={{ fontSize: 13, color: RUSH.red, marginTop: 4 }}>Reason: {a.reason}</div>}
            <div style={{ fontSize: 12, color: RUSH.ink3, marginTop: 6 }}>{a.worker} · {a.time}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
window.AuditHistory = AuditHistory;
