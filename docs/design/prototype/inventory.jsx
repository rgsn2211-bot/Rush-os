/* Rush OS — Owner Inventory: list with quick filters, filter panel, decision info, mobile cards, analysis + restock views. */
const { useState: useStateINV } = React;
const DINV = window.RushData;

function OwnerInventory({ mobile }) {
  const [view, setView] = useState("list");
  const [sel, setSel] = useState(null);
  const go = (v, item) => { if (item) setSel(item); setView(v); };

  if (view === "detail" && sel) return <ItemDetail item={sel} onBack={() => setView("list")} onEdit={() => setView("edit")} mobile={mobile} />;
  if (view === "add") return <ItemForm onBack={() => setView("list")} mobile={mobile} />;
  if (view === "edit" && sel) return <ItemForm item={sel} onBack={() => setView("detail")} mobile={mobile} />;
  if (view === "shelf") return <ShelfLifeSettings onBack={() => setView("list")} mobile={mobile} />;
  if (view === "opened") return <OpenedItemsView onBack={() => setView("list")} mobile={mobile} />;
  if (view === "audit") return <AuditHistory onBack={() => setView("list")} mobile={mobile} />;
  if (view === "restock") return <RestockRecommendations onBack={() => setView("list")} onItem={(it) => go("detail", it)} mobile={mobile} />;
  return <InventoryList go={go} onItem={(it) => go("detail", it)} mobile={mobile} />;
}
window.OwnerInventory = OwnerInventory;

function InventoryList({ go, onItem, mobile }) {
  const [quick, setQuick] = useState("All Items");
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState(false);
  const [adv, setAdv] = useState({ mainCat: "All", shelf: "All", supplier: "All", review: "All", active: "All" });

  const all = [...DINV.inventory, DINV.caramel];
  let rows = all.filter((it) => invMatchesQuick(it, quick));
  if (search) rows = rows.filter((it) => it.name.toLowerCase().includes(search.toLowerCase()));
  if (adv.mainCat !== "All") rows = rows.filter((it) => it.mainCat === adv.mainCat);
  if (adv.shelf !== "All") rows = rows.filter((it) => it.shelf === adv.shelf);
  if (adv.supplier !== "All") rows = rows.filter((it) => it.supplier === adv.supplier);
  if (adv.review !== "All") rows = rows.filter((it) => it.review === adv.review);
  if (adv.active !== "All") rows = rows.filter((it) => (it.active ? "Active" : "Inactive") === adv.active);
  const advCount = Object.values(adv).filter((v) => v !== "All").length;

  const insights = [
    { l: "Restock now", n: all.filter((i) => i.restock === "Restock Now").length, f: "Order Soon", c: RUSH.red, bg: RUSH.redBg, ic: "alert" },
    { l: "Fast & low stock", n: all.filter((i) => invMatchesQuick(i, "Fast-Moving & Low Stock")).length, f: "Fast-Moving & Low Stock", c: RUSH.amber, bg: RUSH.amberBg, ic: "fire" },
    { l: "Expiring soon", n: all.filter((i) => invMatchesQuick(i, "Expiring Soon")).length, f: "Expiring Soon", c: RUSH.amber, bg: RUSH.amberBg, ic: "clock" },
    { l: "Overstocked", n: all.filter((i) => i.restock === "Overstocked").length, f: "Overstocked", c: RUSH.blue, bg: RUSH.blueBg, ic: "box" },
  ];

  const FilterControls = (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
      <Field label="Main category"><Select value={adv.mainCat} onChange={(e) => setAdv({ ...adv, mainCat: e.target.value })} options={["All", ...DINV.mainCategories]} /></Field>
      <Field label="Shelf-life group"><Select value={adv.shelf} onChange={(e) => setAdv({ ...adv, shelf: e.target.value })} options={["All", ...DINV.shelfLifeGroups.map((g) => g.name)]} /></Field>
      <Field label="Supplier"><Select value={adv.supplier} onChange={(e) => setAdv({ ...adv, supplier: e.target.value })} options={["All", ...DINV.suppliers.filter((s) => s !== "Other / New")]} /></Field>
      <Field label="Review status"><Select value={adv.review} onChange={(e) => setAdv({ ...adv, review: e.target.value })} options={["All", "Reviewed", "Needs Review"]} /></Field>
      <Field label="Active / inactive"><Select value={adv.active} onChange={(e) => setAdv({ ...adv, active: e.target.value })} options={["All", "Active", "Inactive"]} /></Field>
    </div>
  );

  return (
    <div>
      <PageHead title="Inventory" sub={`${all.length} items · last count 1 Jun 2026`}
        right={!mobile && <div style={{ display: "flex", gap: 10 }}>
          <Btn kind="secondary" icon="clock" onClick={() => go("opened")}>Opened Items</Btn>
          <Btn kind="secondary" icon="settings" onClick={() => go("shelf")}>Shelf-Life</Btn>
          <Btn kind="primary" icon="plus" onClick={() => go("add")}>Add Item</Btn>
        </div>} />

      {mobile && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          <Btn kind="primary" size="sm" icon="plus" onClick={() => go("add")}>Add</Btn>
          <Btn kind="secondary" size="sm" icon="clock" onClick={() => go("opened")}>Opened Items</Btn>
          <Btn kind="secondary" size="sm" icon="settings" onClick={() => go("shelf")}>Shelf-Life</Btn>
        </div>
      )}

      {/* insight cards -> set quick filter */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        {insights.map((c) => (
          <button key={c.l} onClick={() => setQuick(c.f)} style={{ textAlign: "left", cursor: "pointer", border: `1px solid ${quick === c.f ? c.c : RUSH.line}`, background: "#fff", borderRadius: 12, padding: 15, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={c.ic} size={20} color={c.c} /></div>
            <div><div style={{ fontFamily: RUSH.mono, fontSize: 20, fontWeight: 700, color: c.c }}>{c.n}</div><div style={{ fontSize: 12.5, color: RUSH.ink3, fontWeight: 600 }}>{c.l}</div></div>
          </button>
        ))}
      </div>

      {/* restock recommendations entry */}
      <button onClick={() => go("restock")} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: RUSH.navy, border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="ai" size={21} color="#fff" /></div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Restock Recommendations</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Suggested order quantities with shelf-life protection</div></div>
        <Icon name="chevron" size={18} color="rgba(255,255,255,0.7)" />
      </button>

      {/* search + filters button */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: RUSH.ink3 }}><Icon name="search" size={18} /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item name…" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", fontSize: 14, border: `1px solid ${RUSH.line}`, borderRadius: 10, outline: "none", fontFamily: RUSH.sans }} />
        </div>
        <Btn kind={advCount ? "primary" : "secondary"} icon="filter" onClick={() => setSheet(true)}>Filters{advCount ? ` (${advCount})` : ""}</Btn>
      </div>

      {/* quick filter chips */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 16 }}>
        {INV_QUICK_FILTERS.map((f) => (
          <button key={f} onClick={() => setQuick(f)} style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${quick === f ? RUSH.navy : RUSH.line}`, background: quick === f ? RUSH.navy : "#fff", color: quick === f ? "#fff" : RUSH.ink2, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{f}</button>
        ))}
      </div>

      {/* desktop advanced filter inline (collapsible) */}
      {!mobile && sheet && <Card style={{ marginBottom: 16 }} pad={18}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Filters</span>
          <button onClick={() => { setAdv({ mainCat: "All", shelf: "All", supplier: "All", review: "All", active: "All" }); }} style={{ background: "none", border: "none", color: RUSH.navy, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Clear all</button>
        </div>
        {FilterControls}
        <div style={{ marginTop: 14, textAlign: "right" }}><Btn kind="primary" onClick={() => setSheet(false)}>Apply</Btn></div>
      </Card>}

      {/* list */}
      {rows.length === 0 ? (
        <Card pad={40} style={{ textAlign: "center", color: RUSH.ink3 }}><Icon name="search" size={28} color={RUSH.ink3} /><div style={{ marginTop: 10, fontSize: 14 }}>No items match these filters.</div></Card>
      ) : mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((it) => <InvCard key={it.id} it={it} onClick={() => onItem(it)} />)}
        </div>
      ) : (
        <Card pad={0}>
          <Table onRow={(r) => onItem(r)} cols={[
            { h: "Item", cell: (r) => <div><div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>{r.name}{r.review === "Needs Review" && <ReviewChip />}</div><div style={{ fontSize: 12, color: RUSH.ink3, marginTop: 2, display: "flex", gap: 8 }}><span>{r.mainCat}</span>·<ShelfChip shelf={r.shelf} /></div></div> },
            { h: "Stock", align: "right", cell: (r) => <div style={{ textAlign: "right" }}><div style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{r.stock} {r.base}</div><div style={{ fontSize: 11.5, color: RUSH.ink3 }}>avg {r.avgDaily}/day</div></div> },
            { h: "Days left", align: "right", cell: (r) => <div style={{ textAlign: "right" }}><div style={{ fontFamily: RUSH.mono, fontWeight: 600, color: r.days <= 3 ? RUSH.red : r.days <= 6 ? RUSH.amber : RUSH.ink }}>{r.days}d</div><div style={{ fontSize: 11.5, color: RUSH.ink3 }}>{r.stockoutDate || "—"}</div></div> },
            { h: "Trend", cell: (r) => <TrendTag t={r.trend} /> },
            { h: "Movement", cell: (r) => <MovementTag m={r.movement} size="sm" /> },
            { h: "Restock", cell: (r) => <RestockTag r={r.restock} size="sm" /> },
            { h: "Priority", align: "center", cell: (r) => <PriorityDot p={r.priority} /> },
            { h: "", cell: () => <Icon name="chevron" size={16} color={RUSH.ink3} /> },
          ]} rows={rows} />
        </Card>
      )}

      {/* mobile filter bottom sheet */}
      {mobile && sheet && (
        <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,28,42,0.45)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#fff", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "82%", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: RUSH.line, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>Filters</span>
              <button onClick={() => setAdv({ mainCat: "All", shelf: "All", supplier: "All", review: "All", active: "All" })} style={{ background: "none", border: "none", color: RUSH.navy, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Clear all</button>
            </div>
            {FilterControls}
            <Btn kind="primary" full size="lg" style={{ marginTop: 18 }} onClick={() => setSheet(false)}>Show {rows.length} items</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function InvCard({ it, onClick }) {
  return (
    <button onClick={onClick} style={{ textAlign: "left", width: "100%", background: "#fff", border: `1px solid ${RUSH.line}`, borderRadius: 14, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>{it.name}{it.review === "Needs Review" && <ReviewChip />}</div>
          <div style={{ fontSize: 12, color: RUSH.ink3, marginTop: 3, display: "flex", gap: 7, alignItems: "center" }}>{it.mainCat} · <ShelfChip shelf={it.shelf} /></div>
        </div>
        <PriorityDot p={it.priority} />
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div><div style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 16 }}>{it.stock} <span style={{ fontSize: 11, color: RUSH.ink3 }}>{it.base}</span></div><div style={{ fontSize: 11, color: RUSH.ink3 }}>in stock</div></div>
        <div><div style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 16, color: it.days <= 3 ? RUSH.red : it.days <= 6 ? RUSH.amber : RUSH.ink }}>{it.days}d</div><div style={{ fontSize: 11, color: RUSH.ink3 }}>{it.stockoutDate}</div></div>
        <div style={{ flex: 1, textAlign: "right" }}>{it.status === "expiring" && <div style={{ fontSize: 11.5, color: RUSH.amber, fontWeight: 600 }}>Next expiry 16 Jun</div>}</div>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <RestockTag r={it.restock} size="sm" />
        <MovementTag m={it.movement} size="sm" />
      </div>
    </button>
  );
}

/* ---------- Restock Recommendations ---------- */
function RestockRecommendations({ onBack, onItem, mobile }) {
  const all = DINV.inventory;
  const order = ["i2", "i1", "i5", "i8", "i7", "i3", "i9", "i10"];
  const recItems = order.map((id) => all.find((x) => x.id === id)).filter(Boolean);
  return (
    <div>
      <BackLink onClick={onBack}>Back to inventory</BackLink>
      <PageHead title="Restock Recommendations" sub="Mock suggestions from usage, lead time, safety days, incoming stock & shelf life" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {recItems.map((it) => {
          const rec = DINV.restockRecs[it.id];
          if (!rec) return null;
          return (
            <Card key={it.id} pad={0}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 18px", borderBottom: `1px solid ${RUSH.line2}`, flexWrap: "wrap" }}>
                <button onClick={() => onItem(it)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 16, fontWeight: 700, color: RUSH.navy }}>{it.name}</button>
                <ShelfChip shelf={it.shelf} />
                <div style={{ flex: 1 }} />
                <RestockTag r={rec.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 14, padding: 18 }}>
                <MiniStat label="Current" value={rec.current} suffix="" />
                <MiniStat label="Coverage" value={rec.coverage} suffix="" sub={`stockout ${rec.stockout}`} />
                <MiniStat label="Lead + safety" value={`${rec.lead}+${rec.safety}d`} suffix="" />
                <MiniStat label="Incoming" value={rec.incoming} suffix="" />
                <MiniStat label="Suggested order" value={rec.suggested} suffix="" accent={RUSH.navy} />
              </div>
              <div style={{ display: "flex", gap: 16, padding: "0 18px 16px", flexWrap: "wrap", fontSize: 13, color: RUSH.ink2 }}>
                <span>After order: <b style={{ fontFamily: RUSH.mono }}>{rec.after}</b></span>
                <span>Coverage after: <b style={{ fontFamily: RUSH.mono }}>{rec.afterCov}</b></span>
                <span>Reorder by: <b>{rec.reorderBy}</b></span>
              </div>
              <div style={{ padding: "0 18px 18px" }}>
                <div style={{ display: "flex", gap: 9, padding: 12, background: RUSH.bg, borderRadius: 10, alignItems: "flex-start" }}>
                  <Icon name="ai" size={16} color={RUSH.ink3} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>{rec.reason}</div>
                </div>
                {rec.warning && <div style={{ display: "flex", gap: 9, padding: 12, background: RUSH.amberBg, borderRadius: 10, alignItems: "flex-start", marginTop: 10 }}>
                  <Icon name="alert" size={16} color={RUSH.amber} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}><b>Shelf-life protection:</b> {rec.warning}</div>
                </div>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
window.RestockRecommendations = RestockRecommendations;
