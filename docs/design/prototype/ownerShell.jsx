/* Rush OS — Owner desktop shell: navy sidebar + routing (revised). */
const { useState: useStateOS } = React;

function OwnerApp() {
  const [route, setRoute] = useState("home");
  const nav = [
    { id: "home", label: "Dashboard", icon: "grid" },
    { id: "review", label: "Review Center", icon: "checklist", badge: window.RushData.reviewItems.length },
    { id: "alerts", label: "Alerts", icon: "bell", badge: 4 },
    { sec: "Operations" },
    { id: "inv", label: "Inventory", icon: "box" },
    { id: "products", label: "Product Costing", icon: "tag" },
    { sec: "Finance" },
    { id: "money", label: "Money", icon: "cash" },
    { id: "profit", label: "Profit Reports", icon: "chart" },
    { id: "delivery", label: "Delivery Apps", icon: "delivery" },
    { id: "comp", label: "Complimentary", icon: "gift" },
    { id: "losses", label: "Losses", icon: "trash" },
    { sec: "More" },
    { id: "ai", label: "AI Insights", icon: "ai" },
  ];
  const render = () => {
    switch (route) {
      case "home": return <OwnerHome go={setRoute} />;
      case "review": return <ReviewCenter />;
      case "alerts": return <OwnerAlerts />;
      case "inv": return <OwnerInventory />;
      case "products": return <OwnerProducts />;
      case "money": return <OwnerMoney />;
      case "profit": return <OwnerProfit />;
      case "delivery": return <OwnerDelivery />;
      case "comp": return <OwnerComp />;
      case "losses": return <OwnerLosses />;
      case "ai": return <OwnerAI />;
      default: return <OwnerHome go={setRoute} />;
    }
  };
  return (
    <div style={{ display: "flex", minHeight: "100%", fontFamily: RUSH.sans, color: RUSH.ink, background: RUSH.bg }}>
      <div style={{ width: 244, background: RUSH.navy, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px 14px" }}><Logo light /></div>
        <div style={{ padding: "0 12px", flex: 1, overflowY: "auto" }}>
          {nav.map((n, i) => {
            if (n.sec) return <div key={i} style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, padding: "14px 14px 6px" }}>{n.sec}</div>;
            const active = route === n.id;
            return (
              <button key={n.id} onClick={() => setRoute(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 2, borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
                background: active ? "rgba(255,255,255,0.12)" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.66)", fontSize: 14, fontWeight: active ? 600 : 500, fontFamily: RUSH.sans }}>
                <Icon name={n.icon} size={19} color={active ? "#fff" : "rgba(255,255,255,0.66)"} strokeWidth={1.9} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge ? <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: n.id === "review" ? RUSH.amber : RUSH.red, color: "#fff", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n.badge}</span> : null}
              </button>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={19} color="#fff" /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>Ahmed K.</div><div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>Owner</div></div>
            <Icon name="settings" size={18} color="rgba(255,255,255,0.55)" />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 64, background: "#fff", borderBottom: `1px solid ${RUSH.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ position: "relative", width: 320, maxWidth: "40%" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: RUSH.ink3 }}><Icon name="search" size={18} /></span>
            <input placeholder="Search items, products, costs…" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 38px", fontSize: 13.5, border: `1px solid ${RUSH.line}`, borderRadius: 10, outline: "none", background: RUSH.bg, fontFamily: RUSH.sans }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: RUSH.ink2, fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: RUSH.green }} />Rush · Adliya</div>
            <button onClick={() => setRoute("alerts")} style={{ position: "relative", width: 40, height: 40, borderRadius: 10, border: `1px solid ${RUSH.line}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="bell" size={19} color={RUSH.ink2} />
              <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: 999, background: RUSH.red }} />
            </button>
          </div>
        </div>
        <div style={{ padding: "28px 32px 64px", maxWidth: 1200, margin: "0 auto" }}>{render()}</div>
      </div>
    </div>
  );
}
window.OwnerApp = OwnerApp;
