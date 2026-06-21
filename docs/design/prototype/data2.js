/* Rush OS — extra mock data for revised business logic. Extends window.RushData. */
(function () {
  const D = window.RushData;

  // ---- Money summary ----
  D.moneySummary = {
    cashPosition: 1840.250,
    pendingSettlements: 512.300,
    payables: 535.000,
    expensesMonth: 3120.000,
    inventoryPurchasesMonth: 1240.500,
  };

  // ---- Cash flow ----
  D.cashFlow = {
    availableNow: 1840.250,
    expectedIncoming: 512.300,   // pending settlements
    upcomingOutgoing: 2433.000,  // payables + recurring due
    projected: 1840.250 + 512.300 - 2433.000, // -80.450
    horizon: "Next 30 days",
  };

  // ---- Inventory purchases (invoice-style) ----
  D.purchases = [
    { id: "po1", supplier: "Origin Roasters", date: "14 Jun 2026", status: "Unpaid", method: "—", due: "20 Jun 2026", receipt: true, note: "Monthly bean order",
      items: [ { item: "Ethiopia Beans", qty: 5, unit: "kg", cost: 17.000, expiry: "—", total: 85.000 }, { item: "House Espresso Blend", qty: 8, unit: "kg", cost: 16.000, expiry: "—", total: 128.000 } ], total: 213.000 },
    { id: "po2", supplier: "PackPro", date: "13 Jun 2026", status: "Paid", method: "Card", due: "—", receipt: true, note: "Cups & lids",
      items: [ { item: "12oz Cups", qty: 2, unit: "box", cost: 30.000, expiry: "—", total: 60.000 }, { item: "12oz Lids", qty: 1, unit: "box", cost: 20.000, expiry: "—", total: 20.000 } ], total: 80.000 },
    { id: "po3", supplier: "Awal Dairy", date: "14 Jun 2026", status: "Paid", method: "Cash", due: "—", receipt: true, note: "Daily milk",
      items: [ { item: "Fresh Milk", qty: 2, unit: "case", cost: 6.000, expiry: "18 Jun 2026", total: 12.000 } ], total: 12.000 },
    { id: "po4", supplier: "Daily Bake", date: "14 Jun 2026", status: "Unpaid", method: "—", due: "21 Jun 2026", receipt: false, note: "Worker cash buy — needs review",
      items: [ { item: "Chocolate Cookies", qty: 1, unit: "tray", cost: 4.800, expiry: "16 Jun 2026", total: 4.800 } ], total: 4.800 },
    { id: "po5", supplier: "Barista Supplies Co", date: "11 Jun 2026", status: "Paid", method: "Bank", due: "—", receipt: true, note: "Syrups & oat milk",
      items: [ { item: "Oat Milk", qty: 2, unit: "case", cost: 13.200, expiry: "—", total: 26.400 }, { item: "Vanilla Syrup", qty: 1, unit: "case", cost: 9.000, expiry: "—", total: 9.000 } ], total: 35.400 },
  ];

  // ---- Payables (derived: unpaid purchases + recurring due) ----
  D.payables = [
    { id: "pay1", who: "Origin Roasters", type: "Inventory purchase", amount: 213.000, due: "20 Jun 2026", ref: "PO #po1" },
    { id: "pay2", who: "Daily Bake", type: "Inventory purchase", amount: 4.800, due: "21 Jun 2026", ref: "PO #po4" },
    { id: "pay3", who: "Origin Roasters", type: "Supplier (recurring)", amount: 220.000, due: "20 Jun 2026", ref: "Recurring" },
    { id: "pay4", who: "POS Subscription", type: "Subscription", amount: 18.000, due: "22 Jun 2026", ref: "Recurring" },
    { id: "pay5", who: "Espresso Machine", type: "Installment", amount: 95.000, due: "25 Jun 2026", ref: "Recurring" },
  ];

  // ---- Normal expenses (multi-line) ----
  D.normalExpenses = [
    { id: "ne1", date: "14 Jun", method: "Cash", receipt: true, note: "Hardware store run", total: 6.000,
      lines: [ { cat: "Cleaning", amount: 3.000, desc: "Cleaning supplies" }, { cat: "Maintenance", amount: 2.000, desc: "Door hinge" }, { cat: "Transport", amount: 1.000, desc: "Parking" } ] },
    { id: "ne2", date: "13 Jun", method: "Bank", receipt: true, note: "Electricity", total: 42.500,
      lines: [ { cat: "Utilities", amount: 42.500, desc: "EWA — June" } ] },
    { id: "ne3", date: "10 Jun", method: "Card", receipt: true, note: "Weekend promo", total: 25.000,
      lines: [ { cat: "Marketing", amount: 25.000, desc: "Instagram ads" } ] },
  ];

  // ---- Settlements ----
  D.settlements = {
    card: [
      { id: "s1", period: "1–14 Jun", expected: 388.250, actual: 384.100, fee: 4.150, received: "15 Jun 2026", status: "Received", note: "1.07% processing fee" },
      { id: "s2", period: "Pending batch", expected: 124.200, actual: null, fee: null, received: "Expected 16 Jun", status: "Pending", note: "2-day delay" },
    ],
    benefitpay: [
      { id: "s3", period: "1–14 Jun", expected: 96.600, actual: 96.600, fee: 0.000, received: "Same day", status: "Received", note: "No fee — direct to bank" },
    ],
    delivery: [
      { id: "s4", period: "May 2026", platform: "Talabat", expected: 201.000, actual: 198.500, fee: 2.500, received: "5 Jun 2026", status: "Received", note: "Fixed fees deducted" },
      { id: "s5", period: "Jun (pending)", platform: "Talabat", expected: 88.000, actual: null, fee: null, received: "Expected 5 Jul", status: "Pending", note: "Settles monthly" },
    ],
  };

  // ---- Cash log (manual movements + register events) ----
  D.cashLog = [
    { id: "cl1", date: "14 Jun", type: "Money Out", label: "Owner withdrawal — Ahmed", amount: 50.000, method: "Cash", pl: false },
    { id: "cl2", date: "14 Jun", type: "Money Out", label: "Cookies — Daily Bake (register)", amount: 6.000, method: "Cash", pl: false },
    { id: "cl3", date: "12 Jun", type: "Money In", label: "Owner cash injection", amount: 300.000, method: "Cash", pl: false },
    { id: "cl4", date: "10 Jun", type: "Money Out", label: "Loan payment — Bank", amount: 120.000, method: "Bank", pl: false },
    { id: "cl5", date: "8 Jun", type: "Money In", label: "Catering order (other income)", amount: 45.000, method: "Cash", pl: true },
  ];

  // ---- Delivery platform settings ----
  D.deliverySettings = [
    { name: "Talabat", commission: 25, fixedFee: 0.300, delay: "Monthly · ~5 days after", payout: "Bank transfer", active: true },
    { name: "Jahez", commission: 20, fixedFee: 0.250, delay: "Monthly · ~7 days after", payout: "Bank transfer", active: true },
    { name: "Snoonu", commission: 17, fixedFee: 0.200, delay: "Monthly · ~10 days after", payout: "Bank transfer", active: true },
    { name: "Carriage", commission: 23, fixedFee: 0.300, delay: "Monthly", payout: "Bank transfer", active: false },
  ];

  // Per-platform EOD (daily) — sales + orders only
  D.deliveryEOD = [
    { name: "Talabat", sales: 22.000, orders: 7 },
    { name: "Jahez", sales: 9.500, orders: 3 },
    { name: "Snoonu", sales: 4.500, orders: 2 },
  ];

  // ---- Profit breakdowns ----
  D.productBreakdown = [
    { name: "Flat White", qty: 58, revenue: 81.200, cogs: 22.910, gross: 58.290 },
    { name: "Oat Latte", qty: 41, revenue: 69.700, cogs: 20.992, gross: 48.708 },
    { name: "V60 Cold Coffee", qty: 33, revenue: 49.500, cogs: 13.530, gross: 35.970 },
    { name: "Iced Matcha Latte", qty: 27, revenue: 51.300, cogs: 13.122, gross: 38.178 },
    { name: "Espresso", qty: 31, revenue: 24.800, cogs: 8.928, gross: 15.872 },
    { name: "Chocolate Cookie", qty: 24, revenue: 14.400, cogs: 4.800, gross: 9.600 },
  ];

  D.expenseBreakdown = [
    { cat: "Salaries", amount: 1450.000 },
    { cat: "Rent", amount: 650.000 },
    { cat: "Suppliers (paid)", amount: 540.000 },
    { cat: "Utilities", amount: 210.000 },
    { cat: "Marketing", amount: 120.000 },
    { cat: "Maintenance", amount: 80.000 },
    { cat: "Subscriptions", amount: 70.000 },
  ];

  D.losses = {
    summary: [
      { type: "Complimentary value", amount: 46.900, c: "blue" },
      { type: "Waste value", amount: 38.200, c: "amber" },
      { type: "Remake cost", amount: 9.400, c: "amber" },
      { type: "Staff drink cost", amount: 7.100, c: "blue" },
      { type: "Expired inventory loss", amount: 12.600, c: "red" },
    ],
    detail: [
      { type: "Waste", item: "Fresh Milk", qty: "3.5 L", amount: 11.200 },
      { type: "Expired", item: "Chocolate Cookies", qty: "14 pc", amount: 9.800 },
      { type: "Complimentary", item: "V60 Cold Coffee", qty: "8 servings", amount: 12.000 },
      { type: "Remake", item: "Flat White", qty: "6 servings", amount: 9.400 },
      { type: "Staff", item: "Espresso", qty: "22 shots", amount: 6.336 },
    ],
  };

  // ---- Review Center ----
  D.reviewItems = [
    { id: "r1", type: "New inventory item", title: "Caramel Syrup", detail: "Created by Sara during receiving · 1 case (6 btl) · supplier Barista Supplies Co", by: "Sara A.", time: "Today, 8:55 AM", cat: "Inventory", needs: ["Base unit & conversion", "Official cost", "Reorder settings", "Expiry rule"] },
    { id: "r2", type: "Worker cash purchase", title: "Daily Bake — Chocolate Cookies", detail: "1 tray · temp cost 4.800 BHD · receipt attached", by: "Sara A.", time: "Today, 8:40 AM", cat: "Cost", needs: ["Confirm cost", "Confirm category"] },
    { id: "r3", type: "Cash out from register", title: "Owner withdrawal — 50.000 BHD", detail: "Logged by Sara · no receipt", by: "Sara A.", time: "Yesterday", cat: "Cash", needs: ["Acknowledge"] },
    { id: "r4", type: "Inventory count variance", title: "Oat Milk: −1.5 L vs system", detail: "Counted 0.5 L, system shows 2 L", by: "System", time: "1 Jun count", cat: "Inventory", needs: ["Accept variance", "Adjust stock"] },
    { id: "r5", type: "Missing receipt", title: "Maintenance — 18.000 BHD", detail: "Grinder service · no receipt attached", by: "Sara A.", time: "12 Jun", cat: "Cost", needs: ["Add receipt or approve"] },
    { id: "r6", type: "Unusual waste", title: "High waste day — 14.380 BHD", detail: "2.2% of revenue · above 1.5% target", by: "System", time: "Today", cat: "Waste", needs: ["Review waste log"] },
    { id: "r7", type: "Unconfirmed cost", title: "Caramel Syrup cost not set", detail: "Used in 0 recipes · cost pending", by: "System", time: "Today", cat: "Cost", needs: ["Set official cost"] },
  ];

  // categories for forms
  D.categories = ["Coffee", "Dairy", "Dairy Alt", "Packaging", "Bakery", "Syrups", "Tea", "Other"];
  D.baseUnits = ["g", "kg", "ml", "L", "pc", "btl", "serving"];
  D.suppliers = ["Origin Roasters", "Awal Dairy", "Barista Supplies Co", "PackPro", "Daily Bake", "Other / New"];
})();
