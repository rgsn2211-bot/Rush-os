/* Rush OS — invShared.jsx: inventory badge helpers, status config, usage chart, filter logic. */

/* ---- status configs ---- */
const MOVEMENT = {
  "Fast-Moving": { c: RUSH.green, bg: RUSH.greenBg, icon: "fire" },
  "Normal": { c: RUSH.ink2, bg: RUSH.line2, icon: "chart" },
  "Slow-Moving": { c: RUSH.amber, bg: RUSH.amberBg, icon: "arrowDown" },
  "No Recent Usage": { c: RUSH.red, bg: RUSH.redBg, icon: "clock" },
  "New Item": { c: RUSH.blue, bg: RUSH.blueBg, icon: "plus" },
};

const RESTOCK = {
  "Restock Now": { c: RUSH.red, bg: RUSH.redBg, icon: "alert" },
  "Order Soon": { c: RUSH.amber, bg: RUSH.amberBg, icon: "clock" },
  "Healthy": { c: RUSH.green, bg: RUSH.greenBg, icon: "check" },
  "Overstocked": { c: RUSH.blue, bg: RUSH.blueBg, icon: "box" },
  "Wait Before Ordering": { c: RUSH.ink2, bg: RUSH.line2, icon: "clock" },
  "Expiry Risk": { c: RUSH.amber, bg: RUSH.amberBg, icon: "alert" },
  "Incoming Purchase Covers Need": { c: RUSH.blue, bg: RUSH.blueBg, icon: "receive" },
  "Not Enough Data": { c: RUSH.ink3, bg: RUSH.line2, icon: "ai" },
};

const PRIORITY = { High: RUSH.red, Medium: RUSH.amber, Low: RUSH.green, None: RUSH.ink3 };

const SHELF_COLOR = { "Short Life": RUSH.red, "Medium Life": RUSH.amber, "Long Life": RUSH.blue, "No Expiry": RUSH.green };

function StatusTag({ kind, map, size = "md", showIcon = true }) {
  const cfg = (map || RESTOCK)[kind] || { c: RUSH.ink2, bg: RUSH.line2, icon: "tag" };
  const f = size === "sm" ? 11 : 11.5;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: size === "sm" ? "2px 8px" : "3px 10px", borderRadius: 999, background: cfg.bg, color: cfg.c, fontSize: f, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.4 }}>
      {showIcon && <Icon name={cfg.icon} size={f + 1} color={cfg.c} strokeWidth={2.2} />}
      {kind}
    </span>
  );
}
window.StatusTag = StatusTag;
window.MovementTag = ({ m, size }) => <StatusTag kind={m} map={MOVEMENT} size={size} />;
window.RestockTag = ({ r, size }) => <StatusTag kind={r} map={RESTOCK} size={size} />;

function TrendTag({ t }) {
  const cfg = { Rising: { c: RUSH.green, i: "arrowUp" }, Falling: { c: RUSH.red, i: "arrowDown" }, Stable: { c: RUSH.ink3, i: "chart" } }[t] || { c: RUSH.ink3, i: "chart" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: cfg.c }}><Icon name={cfg.i} size={14} color={cfg.c} />{t}</span>;
}
window.TrendTag = TrendTag;

function PriorityDot({ p, withLabel }) {
  const c = PRIORITY[p] || RUSH.ink3;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: c, flexShrink: 0 }} />
      {withLabel && <span style={{ fontSize: 12.5, fontWeight: 600, color: p === "None" ? RUSH.ink3 : RUSH.ink2 }}>{p}</span>}
    </span>
  );
}
window.PriorityDot = PriorityDot;

function ShelfChip({ shelf }) {
  const c = SHELF_COLOR[shelf] || RUSH.ink3;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: c }}><span style={{ width: 6, height: 6, borderRadius: 2, background: c }} />{shelf}</span>;
}
window.ShelfChip = ShelfChip;

/* ---- usage line chart (SVG area+line) ---- */
function UsageChart({ data, height = 130, color = RUSH.navy, period = "30 Days" }) {
  const w = 600, h = height;
  const max = Math.max(...data, 1) * 1.15;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 20) - 10]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  const avgY = h - (avg / max) * (h - 20) - 10;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        <defs>
          <linearGradient id="ucg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={avgY} x2={w} y2={avgY} stroke={RUSH.ink3} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <path d={area} fill="url(#ucg)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => i === pts.length - 1 && <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={color} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5, color: RUSH.ink3 }}>
        <span>{period === "7 Days" ? "7 days ago" : period === "90 Days" ? "90 days ago" : "30 days ago"}</span>
        <span style={{ color: RUSH.ink3 }}>avg {avg.toFixed(1)}/day</span>
        <span>Today</span>
      </div>
    </div>
  );
}
window.UsageChart = UsageChart;

/* ---- quick-filter definitions + predicate ---- */
window.INV_QUICK_FILTERS = [
  "All Items", "Low Stock", "Order Soon", "Out of Stock", "Expiring Soon", "Needs Review",
  "Overstocked", "Slow-Moving", "Fast-Moving", "Fast-Moving & Low Stock", "Recently Purchased",
];

window.invMatchesQuick = function (it, f) {
  switch (f) {
    case "All Items": return true;
    case "Low Stock": return it.status === "low";
    case "Order Soon": return it.restock === "Order Soon" || it.restock === "Restock Now";
    case "Out of Stock": return it.stock <= 0;
    case "Expiring Soon": return it.status === "expiring" || it.restock === "Expiry Risk";
    case "Needs Review": return it.review === "Needs Review";
    case "Overstocked": return it.restock === "Overstocked";
    case "Slow-Moving": return it.movement === "Slow-Moving";
    case "Fast-Moving": return it.movement === "Fast-Moving";
    case "Fast-Moving & Low Stock": return it.movement === "Fast-Moving" && (it.status === "low" || it.restock === "Restock Now");
    case "Recently Purchased": return !!it.recentlyPurchased;
    default: return true;
  }
};

/* small section header used in detail tabs */
function TabSection({ title, children, right, count }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: RUSH.ink }}>{title}</span>
          {count != null && <Badge color={RUSH.ink2} bg={RUSH.bg}>{count}</Badge>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
window.TabSection = TabSection;
