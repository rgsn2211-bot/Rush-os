/* Rush OS — shared UI primitives + theme. Exposes to window. */
const RUSH = {
  navy: "#1E3A63",
  navy2: "#25456F",
  navySoft: "#2E5183",
  bg: "#F9F9F9",
  card: "#FFFFFF",
  ink: "#1A1F26",
  ink2: "#4A525C",
  ink3: "#8A929C",
  line: "#E8EAED",
  line2: "#EFF1F3",
  green: "oklch(0.62 0.12 150)",
  greenBg: "oklch(0.96 0.03 150)",
  amber: "oklch(0.72 0.12 75)",
  amberBg: "oklch(0.96 0.04 75)",
  red: "oklch(0.60 0.13 25)",
  redBg: "oklch(0.96 0.04 25)",
  blue: "oklch(0.60 0.10 245)",
  blueBg: "oklch(0.96 0.03 245)",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  sans: "'IBM Plex Sans', system-ui, sans-serif",
};
const { money } = window.RushData;

function Card({ children, style, pad = 20, ...rest }) {
  return (
    <div style={{ background: RUSH.card, border: `1px solid ${RUSH.line}`, borderRadius: 14, padding: pad, ...style }} {...rest}>
      {children}
    </div>
  );
}

const STATUS = {
  ok: { c: RUSH.green, bg: RUSH.greenBg, label: "OK" },
  low: { c: RUSH.red, bg: RUSH.redBg, label: "Low stock" },
  expiring: { c: RUSH.amber, bg: RUSH.amberBg, label: "Expiring" },
  urgent: { c: RUSH.red, bg: RUSH.redBg, label: "Urgent" },
  warning: { c: RUSH.amber, bg: RUSH.amberBg, label: "Warning" },
  info: { c: RUSH.blue, bg: RUSH.blueBg, label: "Info" },
};

function Pill({ kind = "ok", children, style }) {
  const s = STATUS[kind] || STATUS.ok;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
      background: s.bg, color: s.c, fontSize: 12, fontWeight: 600, lineHeight: 1.4, whiteSpace: "nowrap", ...style }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.c }} />
      {children || s.label}
    </span>
  );
}

function Badge({ children, color = RUSH.ink2, bg = RUSH.line2, style }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 6, background: bg, color,
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2, ...style }}>{children}</span>
  );
}

function Money({ value, size = 14, weight = 600, color = RUSH.ink, sign = false, suffix = " BHD" }) {
  const neg = value < 0;
  const txt = (sign && value > 0 ? "+" : "") + (neg ? "−" : "") + money(Math.abs(value));
  return <span style={{ fontFamily: RUSH.mono, fontSize: size, fontWeight: weight, color }}>{txt}<span style={{ fontSize: size * 0.7, color: RUSH.ink3, fontWeight: 500 }}>{suffix}</span></span>;
}

function Btn({ children, kind = "primary", icon, size = "md", full, onClick, style }) {
  const sizes = { sm: { p: "8px 14px", f: 13 }, md: { p: "11px 18px", f: 14 }, lg: { p: "16px 22px", f: 16 }, xl: { p: "22px 24px", f: 18 } };
  const z = sizes[size];
  const kinds = {
    primary: { background: RUSH.navy, color: "#fff", border: `1px solid ${RUSH.navy}` },
    secondary: { background: "#fff", color: RUSH.navy, border: `1px solid ${RUSH.line}` },
    ghost: { background: "transparent", color: RUSH.ink2, border: "1px solid transparent" },
    danger: { background: RUSH.redBg, color: RUSH.red, border: `1px solid transparent` },
    dark: { background: RUSH.navy, color: "#fff", border: `1px solid ${RUSH.navy}` },
  };
  return (
    <button onClick={onClick} className="rush-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
      padding: z.p, fontSize: z.f, fontWeight: 600, fontFamily: RUSH.sans, borderRadius: 11, cursor: "pointer",
      width: full ? "100%" : "auto", transition: "filter .15s, transform .05s", ...kinds[kind], ...style }}>
      {icon && <Icon name={icon} size={z.f + 4} />}
      {children}
    </button>
  );
}

function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "block", ...style }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: RUSH.ink2, marginBottom: 7, display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>{hint && <span style={{ color: RUSH.ink3, fontWeight: 500 }}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, mono, big, type = "text", style }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type}
      style={{ width: "100%", boxSizing: "border-box", padding: big ? "15px 16px" : "11px 14px",
        fontSize: big ? 17 : 14.5, fontFamily: mono ? RUSH.mono : RUSH.sans, fontWeight: mono ? 600 : 500,
        color: RUSH.ink, background: "#fff", border: `1px solid ${RUSH.line}`, borderRadius: 10, outline: "none", ...style }}
      onFocus={(e) => (e.target.style.borderColor = RUSH.navy)}
      onBlur={(e) => (e.target.style.borderColor = RUSH.line)} />
  );
}

function Select({ value, onChange, options, big, style }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange}
        style={{ width: "100%", boxSizing: "border-box", padding: big ? "15px 16px" : "11px 14px", paddingRight: 38,
          fontSize: big ? 17 : 14.5, fontFamily: RUSH.sans, fontWeight: 500, color: RUSH.ink, background: "#fff",
          border: `1px solid ${RUSH.line}`, borderRadius: 10, outline: "none", appearance: "none", cursor: "pointer", ...style }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: RUSH.ink3 }}>
        <Icon name="chevronDown" size={18} />
      </span>
    </div>
  );
}

// Drop zone for mock upload / photo
function DropZone({ label = "Tap to upload", sub, icon = "upload", done, onClick, height = 130 }) {
  return (
    <button onClick={onClick} style={{ width: "100%", height, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, background: done ? RUSH.greenBg : "#FBFBFC", border: `1.5px dashed ${done ? RUSH.green : RUSH.line}`,
      borderRadius: 12, cursor: "pointer", color: done ? RUSH.green : RUSH.ink3, fontFamily: RUSH.sans }}>
      <Icon name={done ? "check" : icon} size={26} />
      <div style={{ fontSize: 14, fontWeight: 600, color: done ? RUSH.green : RUSH.ink2 }}>{done ? "Uploaded" : label}</div>
      {sub && <div style={{ fontSize: 12.5 }}>{sub}</div>}
    </button>
  );
}

// Tiny sparkline / bar chart (simple rects only)
function BarMini({ data, height = 56, color = RUSH.navy, soft }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, minHeight: 3, borderRadius: 3,
          background: soft && i < data.length - 1 ? "#D6DDE8" : color }} />
      ))}
    </div>
  );
}

function SectionTitle({ children, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: RUSH.ink, letterSpacing: -0.2 }}>{children}</div>
        {sub && <div style={{ fontSize: 13, color: RUSH.ink3, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Logo({ light, size = 1 }) {
  const c = light ? "#fff" : RUSH.navy;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * size }}>
      <div style={{ width: 34 * size, height: 34 * size, borderRadius: 9 * size, background: light ? "rgba(255,255,255,0.14)" : RUSH.navy,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="coffee" size={20 * size} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontSize: 17 * size, fontWeight: 700, color: c, letterSpacing: -0.3 }}>Rush <span style={{ fontWeight: 400, opacity: 0.7 }}>OS</span></div>
      </div>
    </div>
  );
}

Object.assign(window, { RUSH, Card, Pill, Badge, Money, Btn, Field, Input, Select, DropZone, BarMini, SectionTitle, Logo, STATUS });
