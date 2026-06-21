/* Rush OS — Owner: Review Center (grouped) + routes to Purchase Review. */
const { useState: useStateRV } = React;
const DRV = window.RushData;

const REVIEW_GROUPS = ["All", "Purchases", "New Inventory Items", "Cash Out", "Waste", "Inventory Counts", "Opened Items", "Missing Receipts", "Unconfirmed Costs"];

function ReviewCenter({ mobile }) {
  const [filter, setFilter] = useState("All");
  const [sel, setSel] = useState(null);
  const [audit, setAudit] = useState(false);
  const items = DRV.reviewItems.filter((r) => filter === "All" || r.group === filter);

  if (audit) return <AuditHistory onBack={() => setAudit(false)} mobile={mobile} />;
  if (sel) {
    if (sel.type === "Supplier purchase" || sel.type.includes("cash purchase")) return <PurchaseReview reviewItem={sel} onBack={() => setSel(null)} mobile={mobile} />;
    return <ReviewDetail item={sel} onBack={() => setSel(null)} mobile={mobile} />;
  }

  const groupCounts = {};
  DRV.reviewItems.forEach((r) => { groupCounts[r.group] = (groupCounts[r.group] || 0) + 1; });
  const cards = ["Purchases", "New Inventory Items", "Cash Out", "Inventory Counts", "Opened Items", "Missing Receipts", "Unconfirmed Costs"];

  return (
    <div>
      <PageHead title="Review Center" sub={`${DRV.reviewItems.length} items waiting for your decision`}
        right={<Btn kind="secondary" icon="clock" onClick={() => setAudit(true)}>Audit History</Btn>} />

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginBottom: 22 }}>
        {cards.map((l) => (
          <button key={l} onClick={() => setFilter(l)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${filter === l ? RUSH.navy : RUSH.line}`, borderRadius: 12, padding: 15 }}>
            <div style={{ fontFamily: RUSH.mono, fontSize: 22, fontWeight: 700, color: groupCounts[l] ? RUSH.navy : RUSH.ink3 }}>{groupCounts[l] || 0}</div>
            <div style={{ fontSize: 12.5, color: RUSH.ink2, fontWeight: 600, marginTop: 3 }}>{l}</div>
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto", marginBottom: 16 }}><SegTabs tabs={REVIEW_GROUPS} value={filter} onChange={setFilter} /></div>

      <Card pad={0}>
        {items.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: RUSH.ink3, fontSize: 14 }}>Nothing to review in this group.</div> :
        items.map((r, i) => (
          <div key={r.id} className="rush-row" onClick={() => setSel(r)} style={{ display: "flex", gap: 14, padding: "16px 20px", borderTop: i ? `1px solid ${RUSH.line2}` : "none", alignItems: "center", cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: RUSH.amberBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={reviewIcon(r.type)} size={20} color={RUSH.amber} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ fontSize: 15, fontWeight: 700 }}>{r.title}</span><Badge color={RUSH.ink2} bg={RUSH.bg}>{r.type}</Badge>{r.photo && <Badge color={RUSH.navy} bg={RUSH.blueBg}>Photo</Badge>}</div>
              <div style={{ fontSize: 13, color: RUSH.ink2, marginTop: 3 }}>{r.detail}</div>
              <div style={{ fontSize: 12, color: RUSH.ink3, marginTop: 5 }}>{r.by} · {r.time}{r.amount ? ` · ${money(r.amount)} BHD` : ""}</div>
            </div>
            {!mobile && <Btn kind="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSel(r); }}>Review</Btn>}
            <Icon name="chevron" size={16} color={RUSH.ink3} />
          </div>
        ))}
      </Card>
    </div>
  );
}
window.ReviewCenter = ReviewCenter;

function reviewIcon(type) {
  if (type.includes("Supplier purchase")) return "receive";
  if (type.includes("inventory item")) return "box";
  if (type.includes("cash purchase")) return "receive";
  if (type.includes("Cash out")) return "cash";
  if (type.includes("variance")) return "count";
  if (type.includes("Opened")) return "clock";
  if (type.includes("receipt")) return "receipt";
  if (type.includes("waste")) return "trash";
  return "tag";
}

function ReviewDetail({ item, onBack, mobile }) {
  const [done, setDone] = useState(null);
  return (
    <div>
      <BackLink onClick={onBack}>Back to Review Center</BackLink>
      <PageHead title={item.title} sub={item.type} right={<ReviewChip />} />

      {done && (
        <div style={{ display: "flex", gap: 12, padding: 16, background: done === "approve" ? RUSH.greenBg : RUSH.redBg, borderRadius: 12, marginBottom: 20, alignItems: "center" }}>
          <Icon name={done === "approve" ? "check" : "x"} size={22} color={done === "approve" ? RUSH.green : RUSH.red} />
          <div style={{ fontSize: 14, fontWeight: 600, color: RUSH.ink2 }}>{done === "approve" ? "Approved — applied and removed from review." : "Rejected — sender will be notified."}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.4fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card pad={20}>
            <SectionTitle>Submission</SectionTitle>
            {[["What", item.detail], ["Submitted by", item.by], ["When", item.time], ["Category", item.cat], ["Photo", item.photo ? "Attached" : "None"]].map(([l, v], i) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: i ? `1px solid ${RUSH.line2}` : "none", gap: 20 }}>
                <span style={{ fontSize: 13.5, color: RUSH.ink3, flexShrink: 0 }}>{l}</span><span style={{ fontSize: 13.5, fontWeight: 600, color: RUSH.ink, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card pad={20}>
            <SectionTitle sub="Fix anything before approving">Complete / Correct</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label="Official cost" hint="BHD"><Input mono value="" placeholder="0.000" onChange={() => {}} /></Field>
              <Field label="Base unit"><Select value="L" onChange={() => {}} options={DRV.baseUnits} /></Field>
              <Field label="Main category"><Select value={DRV.mainCategories[0]} onChange={() => {}} options={DRV.mainCategories} /></Field>
              <Field label="Supplier"><Select value={DRV.suppliers[0]} onChange={() => {}} options={DRV.suppliers} /></Field>
              <Field label="Expiry rule"><Select value="Optional" onChange={() => {}} options={["Required", "Optional", "Not needed"]} /></Field>
              <Field label="Reorder min" hint="base unit"><Input mono value="" placeholder="0" onChange={() => {}} /></Field>
            </div>
            <Field label="Receipt note" style={{ marginTop: 14 }}><Input value="" placeholder="Add a note" onChange={() => {}} /></Field>
          </Card>
        </div>

        <Card pad={20} style={{ position: mobile ? "static" : "sticky", top: 84 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Decision</div>
          <div style={{ fontSize: 13, color: RUSH.ink3, marginBottom: 14 }}>Needs: {item.needs.join(", ")}.</div>
          <Btn kind="primary" full size="lg" icon="check" onClick={() => setDone("approve")}>Approve</Btn>
          <Btn kind="secondary" full style={{ marginTop: 8 }} icon="check" onClick={() => setDone("approve")}>Edit & Approve</Btn>
          <Btn kind="danger" full style={{ marginTop: 8 }} icon="x" onClick={() => setDone("reject")}>Reject</Btn>
        </Card>
      </div>
    </div>
  );
}
