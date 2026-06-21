/* Rush OS — Owner MOBILE app: simplified, bottom navigation. */
const { useState: useStateMob } = React;

function OwnerMobileApp() {
  const [route, setRoute] = useState("home");
  const [invTab, setInvTab] = useState("inv");
  const go = (r) => setRoute(r);

  const bottom = [
    { id: "home", label: "Dashboard", icon: "grid" },
    { id: "alerts", label: "Alerts", icon: "bell" },
    { id: "inv", label: "Inventory", icon: "box" },
    { id: "money", label: "Money", icon: "cash" },
    { id: "reports", label: "Reports", icon: "chart" },
  ];
  // which bottom item is active for a given route
  const groupOf = (r) => ({ home: "home", review: "home", alerts: "alerts", inv: "inv", products: "inv", money: "money", reports: "reports", profit: "reports", delivery: "reports", comp: "reports", losses: "reports", ai: "home" }[r] || "home");
  const active = groupOf(route);

  const titles = { home: "Dashboard", review: "Review", alerts: "Alerts", inv: "Inventory", money: "Money", reports: "Reports", profit: "Profit", delivery: "Delivery", comp: "Complimentary", losses: "Losses", ai: "AI Insights" };

  const render = () => {
    switch (route) {
      case "home": return <OwnerHome go={go} mobile />;
      case "review": return <ReviewCenter mobile />;
      case "alerts": return <OwnerAlerts mobile />;
      case "inv": return (
        <div>
          <div style={{ marginBottom: 18 }}><SegTabs tabs={[{ v: "inv", label: "Inventory" }, { v: "products", label: "Products" }]} value={invTab} onChange={setInvTab} /></div>
          {invTab === "inv" ? <OwnerInventory mobile /> : <OwnerProducts mobile />}
        </div>
      );
      case "money": return <OwnerMoney mobile />;
      case "reports": return <OwnerReports go={go} />;
      case "profit": return <OwnerProfit mobile />;
      case "delivery": return <OwnerDelivery mobile />;
      case "comp": return <OwnerComp mobile />;
      case "losses": return <OwnerLosses mobile />;
      case "ai": return <OwnerAI mobile />;
      default: return <OwnerHome go={go} mobile />;
    }
  };

  const showBack = ["profit", "delivery", "comp", "losses", "review", "ai"].includes(route);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: RUSH.sans, color: RUSH.ink, background: RUSH.bg }}>
      {/* top bar */}
      <div style={{ background: RUSH.navy, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {showBack
            ? <button onClick={() => go(route === "review" ? "home" : "reports")} style={{ width: 34, height: 34, borderRadius: 9, border: "none", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="back" size={20} color="#fff" /></button>
            : <Logo light />}
          {showBack && <span style={{ color: "#fff", fontSize: 17, fontWeight: 700 }}>{titles[route]}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => go("review")} style={{ position: "relative", width: 38, height: 38, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="checklist" size={19} color="#fff" />
            <span style={{ position: "absolute", top: 6, right: 6, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: RUSH.amber, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{window.RushData.reviewItems.length}</span>
          </button>
          <button onClick={() => go("alerts")} style={{ position: "relative", width: 38, height: 38, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="bell" size={19} color="#fff" />
            <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: RUSH.red }} />
          </button>
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 24px", WebkitOverflowScrolling: "touch" }} className="rush-mobile-scroll">{render()}</div>

      {/* bottom nav */}
      <div style={{ display: "flex", background: "#fff", borderTop: `1px solid ${RUSH.line}`, flexShrink: 0, paddingBottom: 4 }}>
        {bottom.map((b) => {
          const on = active === b.id;
          return (
            <button key={b.id} onClick={() => go(b.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px 8px", border: "none", background: "none", cursor: "pointer", color: on ? RUSH.navy : RUSH.ink3 }}>
              <Icon name={b.icon} size={22} color={on ? RUSH.navy : RUSH.ink3} strokeWidth={on ? 2.1 : 1.8} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500 }}>{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
window.OwnerMobileApp = OwnerMobileApp;
