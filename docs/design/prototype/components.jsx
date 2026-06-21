/* Rush OS — shared components for the revised prototype. Exposes to window. */
const { useState: useStateC } = React;

/* Segmented pill tabs */
function SegTabs({ tabs, value, onChange, size = "md", style }) {
  const pad = size === "sm" ? "7px 13px" : "9px 16px";
  const fs = size === "sm" ? 13 : 13.5;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", ...style }}>
      {tabs.map((t) => {
        const v = typeof t === "string" ? t : t.v;
        const label = typeof t === "string" ? t : t.label;
        const active = value === v;
        return (
          <button key={v} onClick={() => onChange(v)} style={{ padding: pad, borderRadius: 999, border: `1px solid ${active ? RUSH.navy : RUSH.line}`,
            background: active ? RUSH.navy : "#fff", color: active ? "#fff" : RUSH.ink2, fontSize: fs, fontWeight: 600, cursor: "pointer", fontFamily: RUSH.sans, whiteSpace: "nowrap" }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
window.SegTabs = SegTabs;

/* Date range control — per page */
function DateRangeControl({ value, onChange, presets }) {
  const opts = presets || ["Last closed day", "Last 7 days", "Month-to-date", "Custom"];
  const isCustom = value === "Custom";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", background: RUSH.bg, border: `1px solid ${RUSH.line}`, borderRadius: 10, padding: 3, gap: 2 }}>
        {opts.map((o) => {
          const active = value === o;
          return (
            <button key={o} onClick={() => onChange(o)} style={{ padding: "7px 13px", borderRadius: 8, border: "none", cursor: "pointer",
              background: active ? "#fff" : "transparent", color: active ? RUSH.navy : RUSH.ink3, fontWeight: 600, fontSize: 12.5, fontFamily: RUSH.sans,
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap" }}>{o}</button>
          );
        })}
      </div>
      {isCustom && (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <input type="date" defaultValue="2026-06-01" style={{ padding: "8px 10px", border: `1px solid ${RUSH.line}`, borderRadius: 9, fontSize: 13, fontFamily: RUSH.mono, color: RUSH.ink, outline: "none" }} />
          <span style={{ color: RUSH.ink3, fontSize: 13 }}>→</span>
          <input type="date" defaultValue="2026-06-14" style={{ padding: "8px 10px", border: `1px solid ${RUSH.line}`, borderRadius: 9, fontSize: 13, fontFamily: RUSH.mono, color: RUSH.ink, outline: "none" }} />
        </div>
      )}
    </div>
  );
}
window.DateRangeControl = DateRangeControl;

/* Collapsible / accordion section */
function Collapsible({ title, sub, children, defaultOpen = false, icon }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${RUSH.line}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "15px 18px", background: open ? RUSH.bg : "#fff", border: "none", cursor: "pointer", textAlign: "left" }}>
        {icon && <Icon name={icon} size={19} color={RUSH.navy} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: RUSH.ink }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: RUSH.ink3, marginTop: 2 }}>{sub}</div>}
        </div>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", color: RUSH.ink3 }}><Icon name="chevronDown" size={20} /></span>
      </button>
      {open && <div style={{ padding: 18, borderTop: `1px solid ${RUSH.line2}` }}>{children}</div>}
    </div>
  );
}
window.Collapsible = Collapsible;

/* Confirmation / small modal (fixed overlay) */
function Modal({ title, sub, onClose, children, footer, wide }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,28,42,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: wide ? 640 : 460, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 24px 60px rgba(15,25,45,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 22px", borderBottom: `1px solid ${RUSH.line2}` }}>
          <div><div style={{ fontSize: 18, fontWeight: 700, color: RUSH.ink }}>{title}</div>{sub && <div style={{ fontSize: 13.5, color: RUSH.ink3, marginTop: 3 }}>{sub}</div>}</div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${RUSH.line}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: RUSH.ink2 }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
        {footer && <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "16px 22px", borderTop: `1px solid ${RUSH.line2}`, background: RUSH.bg }}>{footer}</div>}
      </div>
    </div>
  );
}
window.Modal = Modal;

/* Back link */
function BackLink({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", color: RUSH.navy, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0 }}>
      <Icon name="back" size={18} />{children}
    </button>
  );
}
window.BackLink = BackLink;

/* Needs-review chip */
function ReviewChip({ children = "Needs review" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: RUSH.amberBg, color: RUSH.amber, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>
      <Icon name="alert" size={12} color={RUSH.amber} />{children}
    </span>
  );
}
window.ReviewChip = ReviewChip;

/* Small labeled stat for strips */
function MiniStat({ label, value, suffix = "BHD", accent, sub }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: RUSH.ink3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: RUSH.mono, fontSize: 18, fontWeight: 700, color: accent || RUSH.ink, marginTop: 4 }}>{value}{suffix && <span style={{ fontSize: 11, color: RUSH.ink3, marginLeft: 3 }}>{suffix}</span>}</div>
      {sub && <div style={{ fontSize: 11.5, color: RUSH.ink3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
window.MiniStat = MiniStat;
