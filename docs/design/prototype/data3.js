/* Rush OS — data3.js: deep inventory model (classification, usage, movement, restock, batches, opened items, audit, shelf-life groups). Extends RushData in place. */
(function () {
  const D = window.RushData;

  // Shelf-life groups (owner-editable day ranges)
  D.shelfLifeGroups = [
    { id: "short", name: "Short Life", range: "1–7 days", min: 1, max: 7, color: "red", note: "Milk, fresh bakery, opened dairy" },
    { id: "medium", name: "Medium Life", range: "8–30 days", min: 8, max: 30, color: "amber", note: "Roasted beans, fresh syrups" },
    { id: "long", name: "Long Life", range: "31–365 days", min: 31, max: 365, color: "blue", note: "Sealed syrups, matcha, powders" },
    { id: "none", name: "No Expiry", range: "Not tracked", min: 0, max: 0, color: "green", note: "Packaging, cups, cleaning" },
  ];

  D.mainCategories = ["Coffee Beans", "Milk / Dairy", "Baked Goods", "Matcha", "Syrups / Sauces", "Packaging", "Cleaning Supplies", "Other"];

  // helper to make a 14-pt daily usage history around an average with a trend
  const hist = (avg, trend) => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const t = trend === "Rising" ? (i / 13) * 0.5 - 0.2 : trend === "Falling" ? 0.3 - (i / 13) * 0.5 : 0;
      const noise = (Math.sin(i * 1.7) * 0.12);
      arr.push(Math.max(0, +(avg * (1 + t + noise)).toFixed(2)));
    }
    return arr;
  };

  // Enrichment keyed by item id
  const ext = {
    i1: { mainCat: "Milk / Dairy", shelf: "Short Life", avgDaily: 8.9, use7: 9.2, use30: 8.4, trend: "Rising", movement: "Fast-Moving", restock: "Restock Now", priority: "High", review: "Reviewed", active: true, incoming: 0, trackOpen: true, openDays: 2, official: 0.380, latest: 0.395, avg: 0.382, stockValue: 6.84, recentlyPurchased: true, lastPurchase: "14 Jun" },
    i2: { mainCat: "Milk / Dairy", shelf: "Short Life", avgDaily: 1.4, use7: 1.5, use30: 1.1, trend: "Rising", movement: "Fast-Moving", restock: "Restock Now", priority: "High", review: "Reviewed", active: true, incoming: 0, trackOpen: true, openDays: 4, official: 0.870, latest: 0.910, avg: 0.880, stockValue: 1.74, recentlyPurchased: true, lastPurchase: "11 Jun" },
    i3: { mainCat: "Coffee Beans", shelf: "Medium Life", avgDaily: 470, use7: 480, use30: 450, trend: "Stable", movement: "Fast-Moving", restock: "Order Soon", priority: "Medium", review: "Reviewed", active: true, incoming: 5000, official: 0.017, latest: 0.018, avg: 0.0172, stockValue: 71.4, recentlyPurchased: true, lastPurchase: "14 Jun" },
    i4: { mainCat: "Coffee Beans", shelf: "Medium Life", avgDaily: 510, use7: 520, use30: 500, trend: "Stable", movement: "Fast-Moving", restock: "Healthy", priority: "Low", review: "Reviewed", active: true, incoming: 8000, official: 0.016, latest: 0.016, avg: 0.016, stockValue: 89.6, recentlyPurchased: false, lastPurchase: "8 Jun" },
    i5: { mainCat: "Packaging", shelf: "No Expiry", avgDaily: 17, use7: 18, use30: 15, trend: "Rising", movement: "Fast-Moving", restock: "Restock Now", priority: "High", review: "Reviewed", active: true, incoming: 0, official: 0.030, latest: 0.030, avg: 0.030, stockValue: 1.5, recentlyPurchased: true, lastPurchase: "13 Jun" },
    i6: { mainCat: "Packaging", shelf: "No Expiry", avgDaily: 17, use7: 16, use30: 15, trend: "Stable", movement: "Normal", restock: "Healthy", priority: "Low", review: "Reviewed", active: true, incoming: 0, official: 0.020, latest: 0.020, avg: 0.020, stockValue: 18.0, recentlyPurchased: true, lastPurchase: "13 Jun" },
    i7: { mainCat: "Syrups / Sauces", shelf: "Long Life", avgDaily: 0.5, use7: 0.4, use30: 0.7, trend: "Falling", movement: "Slow-Moving", restock: "Order Soon", priority: "Medium", review: "Reviewed", active: true, incoming: 0, trackOpen: true, openDays: 30, official: 1.500, latest: 1.500, avg: 1.500, stockValue: 4.5, recentlyPurchased: false, lastPurchase: "1 Jun" },
    i8: { mainCat: "Baked Goods", shelf: "Short Life", avgDaily: 11, use7: 12, use30: 10, trend: "Stable", movement: "Fast-Moving", restock: "Expiry Risk", priority: "High", review: "Reviewed", active: true, incoming: 0, official: 0.200, latest: 0.200, avg: 0.200, stockValue: 4.8, recentlyPurchased: true, lastPurchase: "14 Jun" },
    i9: { mainCat: "Matcha", shelf: "Long Life", avgDaily: 28, use7: 26, use30: 30, trend: "Falling", movement: "Normal", restock: "Overstocked", priority: "Low", review: "Reviewed", active: true, incoming: 0, trackOpen: true, openDays: 60, official: 0.048, latest: 0.050, avg: 0.048, stockValue: 38.4, recentlyPurchased: false, lastPurchase: "28 May" },
    i10: { mainCat: "Packaging", shelf: "No Expiry", avgDaily: 6, use7: 5, use30: 9, trend: "Falling", movement: "Slow-Moving", restock: "Overstocked", priority: "None", review: "Reviewed", active: true, incoming: 0, official: 0.020, latest: 0.020, avg: 0.020, stockValue: 6.4, recentlyPurchased: false, lastPurchase: "20 May", maxOverride: 250 },
  };

  D.inventory.forEach((it) => {
    const e = ext[it.id];
    if (!e) return;
    Object.assign(it, e);
    it.usageHistory = hist(e.avgDaily, e.trend);
    // stockout date (mock) from days left
    const base = new Date(2026, 5, 14);
    const so = new Date(base.getTime() + it.days * 86400000);
    it.stockoutDate = so.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    it.coverage = it.days;
  });

  // Caramel Syrup — worker-created, needs review (not in main list by default; shown via review)
  D.caramel = { id: "iNew", name: "Caramel Syrup", cat: "Syrups", mainCat: "Syrups / Sauces", shelf: "Long Life", stock: 6, base: "btl", min: 4, days: 30, supplier: "Barista Supplies Co", status: "ok", purchaseUnit: "case (6 btl)", conv: "1 case = 6 btl", expiry: "Optional", safetyDays: 5, lead: 3, avgDaily: 0.2, use7: 0, use30: 0, trend: "Stable", movement: "New Item", restock: "Not Enough Data", priority: "None", review: "Needs Review", active: true, incoming: 0, official: 0, latest: 1.500, avg: 1.500, stockValue: 9.0, recentlyPurchased: true, lastPurchase: "Today" };

  // Expiry batches per item (only expiry-tracked)
  D.batches = {
    i1: [
      { id: "b1", received: "12 Jun", qty: 24, remaining: 6, printedExpiry: "16 Jun", openedQty: 4, openedDate: "14 Jun", openedUseBy: "16 Jun", effective: "16 Jun", status: "Expires Tomorrow" },
      { id: "b2", received: "14 Jun", qty: 24, remaining: 12, printedExpiry: "19 Jun", openedQty: 0, openedDate: "—", openedUseBy: "—", effective: "19 Jun", status: "OK" },
    ],
    i2: [
      { id: "b3", received: "11 Jun", qty: 6, remaining: 2, printedExpiry: "25 Jun", openedQty: 2, openedDate: "13 Jun", openedUseBy: "17 Jun", effective: "17 Jun", status: "Use Within 2 Days" },
    ],
    i8: [
      { id: "b4", received: "13 Jun", qty: 24, remaining: 10, printedExpiry: "15 Jun", openedQty: 0, openedDate: "—", openedUseBy: "—", effective: "15 Jun", status: "Expired" },
      { id: "b5", received: "14 Jun", qty: 24, remaining: 14, printedExpiry: "17 Jun", openedQty: 0, openedDate: "—", openedUseBy: "—", effective: "17 Jun", status: "OK" },
    ],
    i7: [
      { id: "b6", received: "1 Jun", qty: 6, remaining: 3, printedExpiry: "1 Dec", openedQty: 1, openedDate: "5 Jun", openedUseBy: "5 Jul", effective: "5 Jul", status: "Opened Batch" },
    ],
    i9: [
      { id: "b7", received: "28 May", qty: 500, remaining: 800, printedExpiry: "28 Nov", openedQty: 200, openedDate: "1 Jun", openedUseBy: "31 Jul", effective: "31 Jul", status: "Opened Batch" },
    ],
  };

  // Opened items (derived view across inventory)
  D.openedItems = [
    { id: "o1", item: "Fresh Milk", qty: "4 L", openedDate: "14 Jun", useWithin: "2 days", useBy: "16 Jun", effective: "16 Jun", status: "Use Within 2 Days", by: "Sara A." },
    { id: "o2", item: "Oat Milk", qty: "2 L", openedDate: "13 Jun", useWithin: "4 days", useBy: "17 Jun", effective: "17 Jun", status: "OK", by: "Sara A." },
    { id: "o3", item: "Vanilla Syrup", qty: "1 btl", openedDate: "5 Jun", useWithin: "30 days", useBy: "5 Jul", effective: "5 Jul", status: "OK", by: "Owner" },
    { id: "o4", item: "Matcha Powder", qty: "200 g", openedDate: "1 Jun", useWithin: "60 days", useBy: "31 Jul", effective: "31 Jul", status: "OK", by: "Sara A." },
  ];

  // Per-item stock history / usage / waste / purchases for the detail tabs
  D.itemHistory = {
    default: {
      stockHistory: [
        { date: "14 Jun", event: "Purchase received", change: "+24", balance: "—", by: "Sara A." },
        { date: "14 Jun", event: "Sold (POS)", change: "−9", balance: "—", by: "System" },
        { date: "13 Jun", event: "Waste recorded", change: "−2", balance: "—", by: "Sara A." },
        { date: "12 Jun", event: "Purchase received", change: "+24", balance: "—", by: "Sara A." },
        { date: "1 Jun", event: "Count adjustment", change: "−1.5", balance: "—", by: "Owner" },
      ],
      purchases: [
        { date: "14 Jun", supplier: "Awal Dairy", qty: "2 case", cost: "12.000", status: "Paid" },
        { date: "12 Jun", supplier: "Awal Dairy", qty: "2 case", cost: "12.000", status: "Paid" },
        { date: "8 Jun", supplier: "Awal Dairy", qty: "2 case", cost: "11.800", status: "Paid" },
      ],
      usage: [
        { date: "14 Jun", source: "POS sales", qty: "8.4 L" },
        { date: "14 Jun", source: "Staff drinks", qty: "0.3 L" },
        { date: "14 Jun", source: "Remakes", qty: "0.2 L" },
        { date: "13 Jun", source: "POS sales", qty: "9.0 L" },
      ],
      waste: [
        { date: "14 Jun", qty: "0.5 L", reason: "Spoiled" },
        { date: "11 Jun", qty: "0.3 L", reason: "Over-prepared" },
      ],
    },
  };

  // Restock recommendations (mock calc) keyed by id
  D.restockRecs = {
    i2: { current: "2 L", coverage: "1.4 days", stockout: "16 Jun", lead: 3, safety: 4, incoming: "0 L", suggested: "9 L", after: "11 L", afterCov: "7.9 days", reorderBy: "Today", reason: "Fast-moving with rising usage; will run out before delivery (lead 3d + safety 4d > 1.4d coverage).", warning: null, status: "Restock Now" },
    i1: { current: "18 L", coverage: "2.0 days", stockout: "16 Jun", lead: 1, safety: 3, incoming: "0 L", suggested: "24 L", after: "42 L", afterCov: "4.7 days", reorderBy: "Today", reason: "High daily usage; coverage below lead + safety window.", warning: "Short-life item. Ordering 36 L may create expiry risk — suggested quantity reduced to 24 L.", status: "Restock Now" },
    i5: { current: "50 pc", coverage: "3.0 days", stockout: "17 Jun", lead: 7, safety: 10, incoming: "0 pc", suggested: "2 boxes (2000 pc)", after: "2050 pc", afterCov: "≈ 4.0 months", reorderBy: "Today", reason: "Fast-moving, long lead time (7d). Long-life item — safe to hold more.", warning: null, status: "Restock Now" },
    i3: { current: "4200 g", coverage: "9 days", stockout: "23 Jun", lead: 5, safety: 7, incoming: "5000 g", suggested: "0 g", after: "9200 g", afterCov: "19.6 days", reorderBy: "After 18 Jun", reason: "Incoming 5 kg purchase already covers the lead + safety window.", warning: null, status: "Incoming Purchase Covers Need" },
    i7: { current: "3 btl", coverage: "6 days", stockout: "20 Jun", lead: 3, safety: 5, incoming: "0 btl", suggested: "1 btl", after: "4 btl", afterCov: "8 days", reorderBy: "16 Jun", reason: "Slow-moving with falling usage; order a small quantity only.", warning: null, status: "Order Soon" },
    i8: { current: "24 pc", coverage: "2 days", stockout: "16 Jun", lead: 1, safety: 1, incoming: "0 pc", suggested: "12 pc", after: "36 pc", afterCov: "3 days", reorderBy: "Today", reason: "Fast-moving but short shelf life; small frequent orders avoid waste.", warning: "Short-life item. Keep order small — expires within 2–3 days.", status: "Restock Now" },
    i9: { current: "800 g", coverage: "22 days", stockout: "6 Jul", lead: 5, safety: 7, incoming: "0 g", suggested: "0 g", after: "800 g", afterCov: "22 days", reorderBy: "Wait", reason: "Overstocked vs falling usage. Do not reorder yet.", warning: null, status: "Wait Before Ordering" },
    i10: { current: "320 pc", coverage: "53 days", stockout: "—", lead: 7, safety: 10, incoming: "0 pc", suggested: "0 pc", after: "320 pc", afterCov: "≈ 1.8 months", reorderBy: "Wait", reason: "Overstocked and slow-moving. Reduce next order.", warning: null, status: "Overstocked" },
  };

  // Audit history (void / edits)
  D.auditHistory = [
    { id: "au1", action: "Supplier purchase", worker: "Sara A.", time: "14 Jun, 8:40 AM", ownerAction: "Edit & Approve", edited: "Unit cost 4.800 → 4.500", reason: "—", supplier: "Daily Bake" },
    { id: "au2", action: "Supplier purchase", worker: "Sara A.", time: "9 Jun, 7:30 PM", ownerAction: "Void Purchase", edited: "Reversed +2 case milk", reason: "Duplicate entry — milk recorded twice", supplier: "Awal Dairy" },
    { id: "au3", action: "New inventory item", worker: "Sara A.", time: "8 Jun, 10:10 AM", ownerAction: "Approve", edited: "Completed units & cost", reason: "—", supplier: "Origin Roasters" },
    { id: "au4", action: "Cash out", worker: "Sara A.", time: "5 Jun, 6:00 PM", ownerAction: "Approve", edited: "—", reason: "—", supplier: "—" },
  ];

  // Worker-facing inventory alerts (view-only)
  D.workerInvAlerts = [
    { item: "Oat Milk", qty: "2 L", status: "low", days: 1, expiry: null, msg: "Running low — check with owner" },
    { item: "12oz Cups", qty: "50 pc", status: "low", days: 3, expiry: null, msg: "Running low — check with owner" },
    { item: "Fresh Milk", qty: "18 L", status: "expiring", days: 2, expiry: "16 Jun", msg: "Use oldest batch first" },
    { item: "Chocolate Cookies", qty: "10 pc", status: "expired", days: 0, expiry: "15 Jun", msg: "Expired batch — set aside for owner" },
    { item: "Vanilla Syrup", qty: "3 btl", status: "low", days: 6, expiry: null, msg: "Order soon — tell owner" },
  ];

  // Extend review items with grouping + new types (supplier purchase, opened item)
  D.reviewItems.forEach((r) => {
    r.group = r.type.includes("New inventory") ? "New Inventory Items"
      : r.type.includes("cash purchase") ? "Purchases"
      : r.type.includes("Cash out") ? "Cash Out"
      : r.type.includes("variance") || r.type.includes("count") ? "Inventory Counts"
      : r.type.includes("receipt") ? "Missing Receipts"
      : r.type.includes("waste") ? "Waste"
      : r.type.includes("Unconfirmed") ? "Unconfirmed Costs"
      : "Other";
  });
  D.reviewItems.unshift(
    { id: "r0", type: "Supplier purchase", group: "Purchases", title: "Origin Roasters — 213.000 BHD", detail: "5 kg Ethiopia Beans + 8 kg Espresso Blend · Unpaid · due 20 Jun · invoice attached", by: "Sara A.", time: "Today, 9:02 AM", cat: "Inventory", amount: 213.000, photo: true, status: "Unreviewed", needs: ["Confirm costs", "Confirm payment status"], purchaseId: "po1" },
    { id: "r8", type: "Opened item", group: "Opened Items", title: "Fresh Milk opened — 4 L", detail: "Marked opened by Sara · use-by 16 Jun (2 days)", by: "Sara A.", time: "Today, 8:30 AM", cat: "Inventory", photo: false, status: "Unreviewed", needs: ["Acknowledge use-by"] }
  );

  // Notification count for dashboard
  D.notifCount = D.reviewItems.length;
})();
