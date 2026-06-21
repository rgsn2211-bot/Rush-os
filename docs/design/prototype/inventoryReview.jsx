/* Rush OS — Owner Purchase Review (approve / edit & approve / void) + Supplier Payables review. */
const { useState: useStatePR } = React;
const DPR = window.RushData;

function PurchaseReview({ reviewItem, onBack, mobile }) {
  const po = DPR.purchases.find((p) => p.id === reviewItem.purchaseId) || DPR.purchases[0];
  const [done, setDone] = useState(null); // "approve" | "void"
  const [voidModal, setVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [status, setStatus] = useState(po.status);

  const doVoid = () => { setVoidModal(false); setDone("void"); };

  return (
    <div>
      <BackLink onClick={onBack}>Back to Review Center</BackLink>
      <PageHead title={`${po.supplier} — ${money(po.total)} BHD`} sub="Worker-recorded supplier purchase"
        right={<div style={{ display: "flex", gap: 8, alignItems: "center" }}>{reviewItem.photo && <Badge color={RUSH.navy} bg={RUSH.blueBg}>Invoice attached</Badge>}<ReviewChip>Unreviewed</ReviewChip></div>} />

      {done && (
        <div style={{ display: "flex", gap: 12, padding: 16, background: done === "approve" ? RUSH.greenBg : RUSH.redBg, borderRadius: 12, marginBottom: 20, alignItems: "center" }}>
          <Icon name={done === "approve" ? "check" : "x"} size={22} color={done === "approve" ? RUSH.green : RUSH.red} />
          <div style={{ fontSize: 14, fontWeight: 600, color: RUSH.ink2 }}>
            {done === "approve" ? "Purchase approved. Inventory confirmed, costs locked in." : "Purchase voided. Inventory increase, payment & payable effects reversed — kept in Audit History."}
          </div>
        </div>
      )}

      {/* immediate-effect banner */}
      <div style={{ display: "flex", gap: 12, padding: 14, background: RUSH.blueBg, borderRadius: 12, marginBottom: 20, alignItems: "flex-start" }}>
        <Icon name="alert" size={20} color={RUSH.blue} />
        <div style={{ fontSize: 13.5, color: RUSH.ink2, lineHeight: 1.5 }}>Inventory was already increased when the worker recorded this. {po.status === "Unpaid" ? <b>Unpaid — also appears in Supplier Payables / Upcoming Costs (due {po.due}).</b> : "Marked paid by the worker."} Your review confirms the costs and payment.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.5fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* header / invoice */}
          <Card pad={20}>
            <SectionTitle sub="Edit anything before approving">Purchase details</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label="Supplier"><Select value={po.supplier} onChange={() => {}} options={DPR.suppliers} /></Field>
              <Field label="Purchase date"><Input mono value={po.date} onChange={() => {}} /></Field>
              <Field label="Payment status"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={["Paid", "Unpaid"]} /></Field>
              {status === "Paid"
                ? <Field label="Payment method"><Select value={po.method === "—" ? "Cash" : po.method} onChange={() => {}} options={["Cash", "Card", "BenefitPay", "Bank", "Paid by owner"]} /></Field>
                : <Field label="Due date"><Input mono value={po.due} onChange={() => {}} /></Field>}
            </div>
            <Field label="Receipt note" style={{ marginTop: 14 }}><Input value={po.note} onChange={() => {}} /></Field>
          </Card>

          {/* line items — editable */}
          <Card pad={0}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${RUSH.line2}`, fontSize: 16, fontWeight: 700 }}>Items ({po.items.length})</div>
            <Table cols={[
              { h: "Item", cell: (r) => <span style={{ fontWeight: 600 }}>{r.item}</span> },
              { h: "Qty", align: "right", cell: (r) => <input defaultValue={r.qty} style={{ width: 50, padding: "6px 8px", fontFamily: RUSH.mono, fontSize: 13, textAlign: "right", border: `1px solid ${RUSH.line}`, borderRadius: 8, outline: "none" }} /> },
              { h: "Unit", cell: (r) => <span style={{ color: RUSH.ink3 }}>{r.unit}</span> },
              { h: "Unit cost", align: "right", cell: (r) => <input defaultValue={money(r.cost)} style={{ width: 74, padding: "6px 8px", fontFamily: RUSH.mono, fontSize: 13, textAlign: "right", border: `1px solid ${RUSH.line}`, borderRadius: 8, outline: "none" }} /> },
              { h: "Expiry", cell: (r) => <span style={{ fontFamily: RUSH.mono, color: r.expiry === "—" ? RUSH.ink3 : RUSH.amber }}>{r.expiry}</span> },
              { h: "Line total", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 600 }}>{money(r.total)}</span> },
            ]} rows={po.items} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 20px", borderTop: `2px solid ${RUSH.line}`, background: RUSH.bg }}>
              <span style={{ fontWeight: 700 }}>Total</span><span style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 16 }}>{money(po.total)} BHD</span>
            </div>
          </Card>
        </div>

        {/* decision panel */}
        <Card pad={20} style={{ position: mobile ? "static" : "sticky", top: 84 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Decision</div>
          <div style={{ fontSize: 13, color: RUSH.ink3, marginBottom: 14 }}>Recorded by {reviewItem.by} · {reviewItem.time}</div>
          <Btn kind="primary" full size="lg" icon="check" onClick={() => setDone("approve")}>Approve</Btn>
          <Btn kind="secondary" full style={{ marginTop: 8 }} icon="check" onClick={() => setDone("approve")}>Edit & Approve</Btn>
          <Btn kind="danger" full style={{ marginTop: 8 }} icon="x" onClick={() => setVoidModal(true)}>Void Purchase</Btn>
          <div style={{ marginTop: 14, fontSize: 12, color: RUSH.ink3, lineHeight: 1.5 }}>Voiding reverses the inventory increase and any cash / payable effect. The record stays in Audit History.</div>
        </Card>
      </div>

      {voidModal && (
        <Modal title="Void this purchase?" sub="This reverses stock and payment effects" onClose={() => setVoidModal(false)}
          footer={<><Btn kind="ghost" onClick={() => setVoidModal(false)}>Cancel</Btn><Btn kind="danger" icon="x" onClick={doVoid} style={voidReason ? {} : { opacity: 0.5, pointerEvents: "none" }}>Void Purchase</Btn></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[`Reverse inventory increase (${po.items.length} item${po.items.length > 1 ? "s" : ""})`, po.status === "Unpaid" ? "Remove supplier payable" : "Reverse cash / payment", "Remove from active purchase lists", "Keep visible in Audit History"].map((t) => (
                <div key={t} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13.5, color: RUSH.ink2 }}><Icon name="check" size={15} color={RUSH.red} />{t}</div>
              ))}
            </div>
            <Field label="Void reason" hint="required"><Input value={voidReason} placeholder="e.g. duplicate entry, wrong supplier" onChange={(e) => setVoidReason(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
window.PurchaseReview = PurchaseReview;

/* ============ SUPPLIER PAYABLES REVIEW ============ */
function SupplierPayables({ onBack, mobile, inline, onPay }) {
  const [payModalLocal, setPayModalLocal] = useState(null);
  const payModal = inline ? null : payModalLocal;
  const openPay = inline && onPay ? onPay : setPayModalLocal;
  const total = DPR.payables.reduce((s, p) => s + p.amount, 0);
  return (
    <div>
      {onBack && <BackLink onClick={onBack}>Back</BackLink>}
      {!inline && <PageHead title="Supplier Payables" sub="Unpaid purchases & costs due — also shown in Upcoming Costs"
        right={<div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: RUSH.ink3, fontWeight: 600 }}>Total owed</div><div style={{ fontFamily: RUSH.mono, fontWeight: 700, fontSize: 20 }}>{money(total)} BHD</div></div>} />}
      {inline && <div style={{ marginBottom: 14, display: "flex", gap: 10, padding: 13, background: RUSH.blueBg, borderRadius: 11, alignItems: "flex-start" }}><Icon name="alert" size={18} color={RUSH.blue} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>Unpaid purchases & recurring costs due. Total owed <b>{money(total)} BHD</b>. Marking paid decreases cash and closes the payable.</div></div>}
      <Card pad={0}>
        <Table onRow={(r) => openPay({ who: r.who, amount: r.amount })} cols={[
          { h: "Payee", cell: (r) => <span style={{ fontWeight: 600 }}>{r.who}</span> },
          { h: "Type", cell: (r) => <Badge color={RUSH.ink2} bg={RUSH.bg}>{r.type}</Badge> },
          { h: "Reference", cell: (r) => <span style={{ color: RUSH.ink3 }}>{r.ref}</span> },
          { h: "Due", cell: (r) => { const overdue = r.due.includes("20") && false; return <span style={{ fontFamily: RUSH.mono, color: RUSH.ink2 }}>{r.due}</span>; } },
          { h: "Status", cell: (r) => <Pill kind="warning">{r.ref.startsWith("PO") ? "Supplier payable" : "Due soon"}</Pill> },
          { h: "Amount", align: "right", cell: (r) => <span style={{ fontFamily: RUSH.mono, fontWeight: 700 }}>{money(r.amount)}</span> },
          { h: "", cell: (r) => <Btn kind="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openPay({ who: r.who, amount: r.amount }); }}>Mark Paid</Btn> },
        ]} rows={DPR.payables} />
      </Card>

      {payModal && (
        <Modal title="Mark as paid" sub={`${payModal.who} · ${money(payModal.amount)} BHD`} onClose={() => setPayModal(null)}
          footer={<><Btn kind="ghost" onClick={() => setPayModal(null)}>Cancel</Btn><Btn kind="primary" icon="check" onClick={() => setPayModal(null)}>Confirm Payment</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Payment method"><Select value="Bank" onChange={() => {}} options={["Cash", "Card", "BenefitPay", "Bank"]} /></Field>
            <Field label="Payment date"><Input mono value="19 Jun 2026" onChange={() => {}} /></Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 9, padding: 12, background: RUSH.bg, borderRadius: 10, alignItems: "flex-start" }}>
            <Icon name="cash" size={17} color={RUSH.ink3} /><div style={{ fontSize: 13, color: RUSH.ink2, lineHeight: 1.5 }}>Confirming creates a payment record, decreases cash, and closes this payable.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
window.SupplierPayables = SupplierPayables;
window.SupplierPayablesInline = ({ onPay }) => <SupplierPayables inline onPay={onPay} />;
