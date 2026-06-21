/* Rush OS — top-level prototype shell: Worker tablet / Owner desktop / Owner mobile. */
const { useState: useRoot } = React;

function RootApp() {
  const [mode, setMode] = useState(localStorage.getItem("rush_mode") || "worker");
  const choose = (m) => { setMode(m); localStorage.setItem("rush_mode", m); };

  return (
    <div style={{ minHeight: "100vh", background: "#ECEEF1", fontFamily: RUSH.sans }}>
      <div style={{ minHeight: 52, background: "#fff", borderBottom: `1px solid ${RUSH.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px", gap: 12, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: RUSH.navy, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="coffee" size={16} color="#fff" strokeWidth={2} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: RUSH.ink }}>Rush OS</span>
          <span style={{ fontSize: 12, color: RUSH.ink3, fontWeight: 500 }}>· Prototype</span>
        </div>
        <div style={{ display: "flex", background: RUSH.bg, borderRadius: 10, padding: 4, gap: 4, border: `1px solid ${RUSH.line}` }}>
          {[["worker", "Worker Tablet", "count"], ["owner", "Owner Desktop", "grid"], ["ownermobile", "Owner Mobile", "bell"]].map(([m, label, ic]) => (
            <button key={m} onClick={() => choose(m)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer",
              background: mode === m ? "#fff" : "transparent", color: mode === m ? RUSH.navy : RUSH.ink3, fontWeight: 600, fontSize: 12.5, fontFamily: RUSH.sans,
              boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              <Icon name={ic} size={15} />{label}
            </button>
          ))}
        </div>
        <div style={{ width: 90 }} />
      </div>

      {mode === "owner" && <div style={{ background: RUSH.bg }}><OwnerApp /></div>}

      {mode === "worker" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "30px 16px 40px", minHeight: "calc(100vh - 52px)", boxSizing: "border-box" }}>
          <div style={{ width: 540, maxWidth: "100%", background: "#0E141C", borderRadius: 40, padding: 14, boxShadow: "0 30px 70px rgba(20,30,50,0.28)", alignSelf: "flex-start" }}>
            <div style={{ borderRadius: 28, overflow: "hidden", background: RUSH.bg, height: "calc(100vh - 52px - 70px - 28px)", minHeight: 600, overflowY: "auto", position: "relative", WebkitOverflowScrolling: "touch" }} className="rush-tablet-screen">
              <WorkerApp />
            </div>
          </div>
        </div>
      )}

      {mode === "ownermobile" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "30px 16px 40px", minHeight: "calc(100vh - 52px)", boxSizing: "border-box" }}>
          <div style={{ width: 404, maxWidth: "100%", background: "#0E141C", borderRadius: 44, padding: 13, boxShadow: "0 30px 70px rgba(20,30,50,0.28)", alignSelf: "flex-start" }}>
            <div style={{ borderRadius: 32, overflow: "hidden", background: RUSH.bg, height: "calc(100vh - 52px - 70px - 26px)", minHeight: 640, position: "relative" }} className="rush-tablet-screen">
              <OwnerMobileApp />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RootApp />);
